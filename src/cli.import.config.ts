import { LogConfig } from '@basemaps/shared';
import { Command, flags } from '@oclif/command';
import PLimit from 'p-limit';
import { PrettyTransform } from 'pretty-json-log';
import { fs, Updater } from './base.config';
import { ImageryUpdater } from './imagery.config';
import { ProviderUpdater } from './provider.config';
import { StyleUpdater } from './style.conifg';
import { TileSetUpdater } from './tileset.config';

const Q = PLimit(10);

export class CommandImport extends Command {
  static description = 'Import Basemaps configs';

  static flags = {
    tag: flags.string({ char: 't', description: 'PR tag(PR-number) or production', required: true }),
    commit: flags.boolean({ description: 'Actually run job' }),
  };

  promises: Promise<boolean>[] = [];
  imagery = new Set<string>();
  hasChanges = false;

  async run(): Promise<void> {
    if (process.stdout.isTTY) LogConfig.setOutputStream(PrettyTransform.stream());
    const logger = LogConfig.get();
    const { flags } = this.parse(CommandImport);

    for await (const fileName of fs.list(`./config/imagery`)) this.update(fileName, flags.tag, flags.commit);
    for await (const fileName of fs.list(`./config/style`)) this.update(fileName, flags.tag, flags.commit);
    for await (const fileName of fs.list(`./config/provider`)) this.update(fileName, flags.tag, flags.commit);

    const res = await Promise.all(this.promises);
    this.promises = [];
    if (res.find((f) => f === false)) {
      logger.fatal('Failed to validate configuration')
      process.exit(1);
    }

    for await (const filename of fs.list(`./config/tileset`)) {
      const updater = new TileSetUpdater(filename, await fs.readJson(filename), flags.tag, flags.commit, this.imagery);
      await updater.reconcile();
    }
    if (this.hasChanges) {
      logger.warn('FlushCache');
      if (flags.commit) {
        // invalidate /v1/*
      }
    }

    if (flags.commit !== true) logger.info('DryRun:Done');
  }

  getUpdater(fileName: string, config: unknown, tag: string, commit: boolean): Updater {
    if (fileName.includes('/imagery/')) return new ImageryUpdater(fileName, config, tag, commit);
    if (fileName.includes('/style/')) return new StyleUpdater(fileName, config, tag, commit);
    if (fileName.includes('/provider/')) return new ProviderUpdater(fileName, config, tag, commit);
    throw new Error(`Unable to find updater for path:${fileName}`);
  }

  update(fileName: string, tag: string, commit: boolean): void {
    const promise = Q(
      async (): Promise<boolean> => {
        const json = await fs.readJson(fileName);
        const updater = this.getUpdater(fileName, json, tag, commit);

        if (updater.isValid) {
          const isValid = await updater.isValid();
          if (!isValid) {
            updater.logger.error('InvalidConfig');
            return false;
          }
        }

        const hasChanges = await updater.reconcile();
        this.hasChanges = this.hasChanges || hasChanges;
        if (fileName.includes('/imagery/')) this.imagery.add(updater.config.id);
        return true;
      },
    );
    this.promises.push(promise);
  }
}
