import { invalidateCache, uploadStaticFile } from '@basemaps/cli/build/cli/util.js';
import { LogConfig } from '@basemaps/shared';
import { fsa } from '@chunkd/fs';
import { Command, Flags } from '@oclif/core';
import path from 'path';
import { Q, Updater } from '../base.config.js';
import { TileSetUpdater } from '../config/tileset.updater.js';
import { ProviderUpdater } from '../config/provider.updater.js';
import { StyleUpdater } from '../config/style.updater.js';

export enum UpdaterType {
  Style = 'style',
  TileSet = 'tileset',
  Provider = 'provider',
  Sprites = 'sprites',
}

const HostPrefix = process.env.NODE_ENV === 'production' ? '' : 'dev.';

export class CommandImport extends Command {
  static description = 'Import Basemaps configs';

  static flags = {
    tag: Flags.string({ char: 't', description: 'PR tag(PR-number) or production', required: true }),
    commit: Flags.boolean({ description: 'Import and commit to AWS' }),
    update: Flags.string({ description: 'List of items to update', options: Object.values(UpdaterType), required: false }),
    verbose: Flags.boolean({ description: 'Verbose logging', default: false }),
  };

  promises: Promise<boolean>[] = [];
  /** List of paths to invalidate at the end of the request */
  invalidations: string[] = [];

  /** wait for all promises in this.promises to exectue */
  async join(): Promise<boolean[]> {
    const ret = await Promise.all(this.promises);
    this.promises = [];
    return ret;
  }

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags } = await this.parse(CommandImport);
    if (flags.verbose) logger.level = 'trace';

    const healthEndpoint = `https://${HostPrefix}basemaps.linz.govt.nz/v1/health?version=${flags.tag}`;

    logger.info({ url: healthEndpoint }, 'ValidateHealth');
    if (flags.commit) {
      const res = await fetch(healthEndpoint);
      if (!res.ok) throw new Error('Cannot update basemaps is unhealthy');
    }

    if (flags.update == null || flags.update.includes(UpdaterType.Style)) {
      for await (const fileName of fsa.list(`./config/style`)) this.update(fileName, flags.tag, flags.commit);
    }
    if (flags.update == null || flags.update.includes(UpdaterType.Provider)) {
      for await (const fileName of fsa.list(`./config/provider`)) this.update(fileName, flags.tag, flags.commit);
    }

    const res = await this.join();
    if (res.find((f) => f === false)) {
      logger.fatal('Failed to validate configuration');
      process.exit(1);
    }

    if (flags.update == null || flags.update.includes(UpdaterType.TileSet)) {
      for await (const filename of fsa.list(`./config/tileset`)) {
        const updater = new TileSetUpdater(filename, await fsa.readJson(filename), flags.tag, flags.commit);
        await updater.reconcile();
        if (updater.invalidationPaths.length > 0) this.invalidations.push(...updater.invalidationPaths);
      }
    }

    let isSpriteUploaded = false;

    if (flags.update == null || flags.update.includes(UpdaterType.Sprites)) {
      const absSpritePath = path.resolve(`./build/sprites`);
      for await (const fileName of fsa.list(absSpritePath)) {
        let contentType = null;
        // This should avoid us uploading the .svg files in the sub directories
        if (fileName.endsWith('.json')) contentType = 'application/json';
        if (fileName.endsWith('.png')) contentType = 'image/png';

        if (contentType == null) continue;
        const targetKey = path.join(`/sprites`, fileName.slice(absSpritePath.length));
        console.log(fileName, targetKey);
        if (flags.commit) {
          const isUploaded = await uploadStaticFile(fileName, targetKey, contentType, 'public, max-age=60, stale-while-revalidate=300');
          if (isUploaded) {
            logger.info({ path: targetKey }, 'Sprite:Upload');
            isSpriteUploaded = true;
          }
        }
      }
      if (isSpriteUploaded) this.invalidations.push('/sprites/*');
    }

    if (flags.commit && this.invalidations.length > 0) {
      // Lots of invalidations just invalidate everything
      if (this.invalidations.length > 10) {
        await invalidateCache('/*', flags.commit);
      } else {
        await invalidateCache(this.invalidations, flags.commit);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await fetch(healthEndpoint);
      if (!res.ok) throw new Error('Basemaps is unhealthy');
    }

    if (flags.commit !== true) logger.info('DryRun:Done');
  }

  getUpdater(fileName: string, config: unknown, tag: string, commit: boolean): Updater[] {
    if (fileName.includes('/style/')) return [new StyleUpdater(fileName, config, tag, commit)];
    if (fileName.includes('/provider/')) return [new ProviderUpdater(fileName, config, tag, commit)];
    throw new Error(`Unable to find updater for path:${fileName}`);
  }

  update(fileName: string, tag: string, commit: boolean): void {
    const promise = Q(async (): Promise<boolean> => {
      const json = await fsa.readJson(fileName);
      const updaters = this.getUpdater(fileName, json, tag, commit);

      for (const updater of updaters) {
        if (updater.isValid) {
          const isValid = await updater.isValid();
          if (!isValid) {
            updater.logger.error('InvalidConfig');
            return false;
          }
        }

        const hasChanges = await updater.reconcile();
        if (hasChanges && updater.invalidatePath) this.invalidations.push(updater.invalidatePath());
      }
      return true;
    });
    this.promises.push(promise);
  }
}
