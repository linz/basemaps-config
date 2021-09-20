import { ConfigTileSet, TileSetType } from '@basemaps/config';
import { Config } from '@basemaps/shared';
import { Updater } from './base.config.js';
import { ConfigImagerySchema, zImageConfig } from './imagery.config.js';

export class ImageryTileSetUpdater extends Updater<ConfigImagerySchema, ConfigTileSet> {
  db = Config.TileSet;
  imgId: string;

  constructor(filename: string, config: unknown, tag: string, isCommit: boolean) {
    super(filename, config, tag, isCommit);
    this.imgId = Config.unprefix(Config.Imagery.prefix, this.config.id);
    this.id = this.getId();
  }

  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */

  assertConfig(json: unknown): asserts json is ConfigImagerySchema {
    const validate = zImageConfig.parse(json);
    if (!validate) throw Error('Invalidate Type');
  }

  getId(): string {
    // No tagging needed for individual imagery tilesets
    return this.db.id(this.imgId);
  }

  prepareNewData(oldData: ConfigTileSet | null): ConfigTileSet {
    const now = Date.now();
    const projection = this.config.projection;

    const tileSet: ConfigTileSet = {
      type: TileSetType.Raster,
      id: this.getId(),
      name: this.config.name,
      layers: [
        {
          [projection]: Config.Imagery.id(this.imgId),
          name: this.config.name,
          minZoom: 0,
          maxZoom: 32,
        },
      ],
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
    };
    return tileSet;
  }

  invalidatePath(): string {
    return `/v1/tiles/${this.imgId}/*`;
  }
}
