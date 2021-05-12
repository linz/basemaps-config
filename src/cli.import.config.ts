import { LogConfig } from '@basemaps/shared';
import { Command, flags } from '@oclif/command';
import { importImagery } from './imagery.config';
import { importProvider } from './provider.config';
import { importStyle } from './style.conifg';
import { importTileSet } from './tileset.config';

export class CommandImport extends Command {
  static description = 'Import Basemaps configs';

  static flags = {
    tag: flags.string({ char: 't', description: 'PR tag(PR-number) or production', required: true }),
    commit: flags.boolean({ description: 'Actually run job' }),
  };

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags } = this.parse(CommandImport);

    const imagery = await importImagery(flags.tag, flags.commit, logger);
    await importStyle(flags.tag, flags.commit, logger);
    await importProvider(flags.tag, flags.commit, logger);
    await importTileSet(flags.tag, flags.commit, logger, imagery);

    if (flags.commit !== true) logger.info('DryRun');
  }
}

CommandImport.run();
