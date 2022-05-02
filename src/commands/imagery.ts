import { TileMatrixSets } from '@basemaps/geo';
import { LogConfig } from '@basemaps/shared';
import { Command, Flags } from '@oclif/core';
import { ImageryCache } from '../config/imagery.config.js';
import { TileSetUpdater } from '../config/tileset.updater.js';

export class CommandImportImagery extends Command {
  static description = 'Import imagery';

  static flags = {
    version: Flags.version(),
    help: Flags.help(),
    commit: Flags.boolean({ description: 'Actually import fonts' }),
    verbose: Flags.boolean({ description: 'Verbose logging', default: false }),
    name: Flags.string({ description: 'Imagery set name', required: true }),
    'tile-matrix-set': Flags.string({ description: 'Imagery tile matrix set [WebMercatorQuad | NZTM2000Quad]', required: true }),
  };

  static args = [{ name: 'uri', required: true }];

  async run(): Promise<void> {
    const logger = LogConfig.get();

    const { flags, args } = await this.parse(CommandImportImagery);
    if (flags.verbose) logger.level = 'trace';

    const tms = TileMatrixSets.find(flags['tile-matrix-set']);
    if (tms == null) throw new Error('Cannot find tile-matrix-set: ' + flags['tile-matrix-set']);

    if (!args.uri.startsWith('s3://')) throw new Error('URI must start with s3://');

    const imageryConfig = await ImageryCache.toImageryConfig(args.uri, flags.name, tms, logger);

    await TileSetUpdater.ensureImageryConfig([imageryConfig], flags.commit, logger);
  }
}
