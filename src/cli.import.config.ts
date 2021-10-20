import { LogConfig } from '@basemaps/shared';
import { invalidateCache } from '@basemaps/cli/build/cli/util.js';
import { Command, flags } from '@oclif/command';
import PLimit from 'p-limit';
import { PrettyTransform } from 'pretty-json-log';
import { Updater } from './base.config.js';
import { ImageryUpdater } from './imagery.config.js';
import { ProviderUpdater } from './provider.config.js';
import { StyleUpdater } from './style.conifg.js';
import { TileSetUpdater } from './tileset.config.js';
import { ImageryTileSetUpdater } from './imagery.tileset.config.js';
import { fsa } from '@chunkd/fs';

const Q = PLimit(10);

export class CommandImport extends Command {
  static description = 'Import Basemaps configs';

  static flags = {
    tag: flags.string({ char: 't', description: 'PR tag(PR-number) or production', required: true }),
    commit: flags.boolean({ description: 'Actually run job' }),
  };

  promises: Promise<boolean>[] = [];
  imagery = new Set<string>();
  invalidates: string[] = [];

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags } = this.parse(CommandImport);

    for await (const fileName of fsa.list(`./config/imagery`)) this.update(fileName, flags.tag, flags.commit);
    for await (const fileName of fsa.list(`./config/style`)) this.update(fileName, flags.tag, flags.commit);
    for await (const fileName of fsa.list(`./config/provider`)) this.update(fileName, flags.tag, flags.commit);

    const res = await Promise.all(this.promises);
    this.promises = [];
    if (res.find((f) => f === false)) {
      logger.fatal('Failed to validate configuration');
      process.exit(1);
    }

    for await (const filename of fsa.list(`./config/tileset`)) {
      const updater = new TileSetUpdater(filename, await fsa.readJson(filename), flags.tag, flags.commit, this.imagery);
      const hasChanges = await updater.reconcile();
      if (hasChanges && updater.invalidatePath) this.invalidates.push(updater.invalidatePath());
    }

    if (flags.commit) {
      // Limit invalidations
      for (const invalidate of this.invalidates.slice(0, 10)) {
        logger.warn(`FlushCache: ${invalidate}`);
        await invalidateCache(invalidate, flags.commit);
      }
    }

    if (flags.commit !== true) logger.info('DryRun:Done');
  }

  getUpdater(fileName: string, config: unknown, tag: string, commit: boolean): Updater[] {
    if (fileName.includes('/imagery/')) return [new ImageryUpdater(fileName, config, tag, commit), new ImageryTileSetUpdater(fileName, config, tag, commit)];
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
        if (hasChanges && updater.invalidatePath) this.invalidates.push(updater.invalidatePath());

        if (fileName.includes('/imagery/')) this.imagery.add(updater.config.id);
      }
      return true;
    });
    this.promises.push(promise);
  }
}
