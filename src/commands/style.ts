import { Command, Flags } from '@oclif/core';
import { fsa } from '@chunkd/fs';
import { LogConfig } from '@basemaps/shared';
import { StyleJson } from '@basemaps/config';
import prettier from 'prettier';

export class CommandImportStyle extends Command {
  static description = 'Import style json';

  static flags = {
    commit: Flags.boolean({ description: 'Actually run job' }),
    style: Flags.string({ description: 'Style to import into', default: 'topographic' }),
  };
  static args = [{ name: 'url', description: 'Style location', required: true }];

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags, args } = await this.parse(CommandImportStyle);

    const json = await fsa.readJson<StyleJson>(args.url);
    if (json.version !== 8) return logger.error('Style:Invalid - Invalid version');
    if (!Array.isArray(json.layers)) return logger.error('Style:Invalid - Missing layers');

    const targetStyle = await fsa.readJson<StyleJson>(`./config/style/${flags.style}.json`);
    targetStyle.layers = json.layers;
    const after = JSON.stringify(targetStyle);

    const cfg = await prettier.resolveConfigFile();
    if (cfg == null) return logger.error('Prettier:MissingConfig');
    const options = await prettier.resolveConfig(cfg);
    const formatted = prettier.format(after, { ...options, parser: 'json' });
    if (flags.commit) await fsa.write(`./config/style/${flags.style}.json`, formatted);
  }
}
