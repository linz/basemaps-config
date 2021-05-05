import { LogConfig } from '@basemaps/shared';
import { Command, flags } from '@oclif/command';
import { importImagery } from './imagery.config';
import { importProvider } from './provider.config';
import { importStyle } from './style.conifg';
import { importTileSet } from './tileset.config';

export class CommandImport extends Command {
  static description = 'Import Basemaps configs';

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),

    tag: flags.string({ char: 't', description: 'PR tag(PR-number)', required: true }),
    commit: flags.boolean({ description: 'Actually run job' }),
  };

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags } = this.parse(CommandImport);

    Promise.all;
    await importTileSet(flags.tag, flags.commit, logger);
    await importStyle(flags.tag, flags.commit, logger);
    await importProvider(flags.tag, flags.commit, logger);
    await importImagery(flags.tag, flags.commit, logger);

    if (flags.commit !== true) logger.info('DryRun');
  }
}

CommandImport.run();
