import { ConfigDynamoBase, ConfigImagery, ConfigTileSet, parseRgba, TileSetType } from '@basemaps/config';
import { GoogleTms, Nztm2000QuadTms } from '@basemaps/geo';
import { Config, LogConfig, LogType } from '@basemaps/shared';
import { url } from 'inspector';
import { Production } from '../base.config.js';
import { ConfigDiff } from '../config.diff.js';
import { ImageryCache } from './imagery.config.js';
import { TileSetConfigSchema, zTileSetConfig } from './tileset.parse.js';

export class TileSetUpdater {
  path: string;
  config: TileSetConfigSchema;
  tag: string;
  isCommit: boolean;
  logger: LogType;

  invalidationPaths: string[] = [];

  constructor(path: string, config: unknown, tag: string, isCommit: boolean) {
    this.path = path;
    if (typeof config === 'string') config = JSON.parse(config);
    this.config = zTileSetConfig.parse(config);
    this.tag = tag;
    this.isCommit = isCommit ? isCommit : false;
    this.logger = LogConfig.get().child({ file: this.path });
  }

  getId(tag: string): string {
    if (tag === Production) return Config.TileSet.id(this.config.id);
    return Config.TileSet.id(`${this.config.id}@${tag}`);
  }

  /** Find all imagery referenced inside configuration */
  async loadAllImagery(): Promise<ConfigImagery[]> {
    if (this.config.type === TileSetType.Vector) return [];
    const imageryPaths: Promise<ConfigImagery>[] = [];
    for (const l of this.config.layers) {
      const path2193 = l[2193];
      if (path2193) {
        if (!path2193.startsWith('s3://')) throw new Error('Unknown 2193 path: ' + path2193);
        imageryPaths.push(ImageryCache.toImageryConfig(path2193, l.name, Nztm2000QuadTms, this.logger));
      }

      const path3857 = l[3857];
      if (path3857) {
        if (!path3857.startsWith('s3://')) throw new Error('Unknown 3857 path: ' + path3857);
        imageryPaths.push(ImageryCache.toImageryConfig(path3857, l.name, GoogleTms, this.logger));
      }
    }

    this.logger.trace({ count: imageryPaths.length }, 'LoadImagery');
    const ret = await Promise.all(imageryPaths);
    this.logger.debug({ count: imageryPaths.length }, 'LoadImagery:Done');
    return ret;
  }

  /** Ensure all imagery is present in the database with a associated tileset */
  async ensureImageryConfig(img: ConfigImagery[]): Promise<boolean> {
    if (img.length === 0) return false;

    let hasChanges = false;
    const allImgIds = new Set(img.map((i) => i.id));
    const allTsIds = new Set(img.map((i) => i.id.replace('im_', 'ts_')));

    const existingImagery = await Config.Imagery.getAll(allImgIds);
    this.logger.info({ count: existingImagery.size }, 'LoadImageryConfig:Done');

    const existingTileSets = await Config.TileSet.getAll(allTsIds);
    this.logger.info({ count: existingTileSets.size }, 'LoadTileSetConfig:Done');

    for (const i of img) {
      let hasImageryChanged = false;
      const dbImagery = existingImagery.get(i.id);
      if (dbImagery == null || ConfigDiff.showDiff('im', dbImagery, i, this.logger)) {
        const operation = dbImagery == null ? 'Insert' : 'Update';
        this.logger.info({ type: 'im', record: i.id, title: i.name, projection: i.projection }, `Change:${operation}`);
        if (this.isCommit) {
          i.createdAt = dbImagery?.createdAt ?? i.createdAt;

          if (Config.Imagery instanceof ConfigDynamoBase) await Config.Imagery.put(i);
          else throw new Error('Unable to commit changes to: ' + Config.Imagery.prefix);
        }
        hasImageryChanged = true;
      }

      // Create a tile set for the imagery
      const tsId = i.id.replace('im_', 'ts_');
      const tileSet = ImageryCache.toTileSet(tsId, i);
      const dbTileSet = existingTileSets.get(tsId);
      if (dbTileSet == null || ConfigDiff.showDiff('ts', dbTileSet, tileSet, this.logger)) {
        const operation = dbTileSet == null ? 'Insert' : 'Update';
        this.logger.info({ type: 'ts', record: tsId, title: i.name, projection: i.projection }, `Change:${operation}`);
        if (this.isCommit) {
          tileSet.createdAt = dbTileSet?.createdAt ?? tileSet.createdAt;

          if (Config.TileSet instanceof ConfigDynamoBase) await Config.TileSet.put(tileSet);
          else throw new Error('Unable to commit changes to: ' + Config.TileSet.prefix);
        }
        hasImageryChanged = true;
      }

      // Invalidate the existing tile set as something has changed path
      if (hasImageryChanged) this.invalidationPaths.push(`/v1/tiles/${tsId}/*`);
      hasChanges = hasChanges || hasImageryChanged;
    }
    return hasChanges;
  }

  async reconcile(): Promise<boolean> {
    const imagerySets = await this.loadAllImagery();
    let hasChanges = await this.ensureImageryConfig(imagerySets);

    const oldData = await Config.TileSet.get(this.getId(this.tag));
    const newData = this.prepareNewData(oldData, imagerySets);

    if (oldData == null || ConfigDiff.showDiff('ts', oldData, newData, this.logger)) {
      const operation = oldData == null ? 'Insert' : 'Update';
      this.logger.info({ type: Config.TileSet.prefix, record: newData.id }, `Change:${operation}`);
      if (this.isCommit) {
        if (Config.TileSet instanceof ConfigDynamoBase) await Config.TileSet.put(newData);
        else throw new Error('Unable to commit changes to: ' + Config.TileSet.prefix);
      }
      hasChanges = true;
      this.invalidationPaths.push(`/v1/tiles/${newData.name}`);
    }
    // this.logger.trace({ type: this.db.prefix, record: newData.id }, 'NoChanges');
    return hasChanges;
  }

  prepareNewData(oldData: ConfigTileSet | null, imagery: ConfigImagery[]): ConfigTileSet {
    const now = Date.now();

    // Get the type of tileset, Default Raster
    let type = TileSetType.Raster;
    if (this.config.type === TileSetType.Vector) type = TileSetType.Vector;

    // Prepare background if exists
    const background = this.config.background ? parseRgba(this.config.background) : null;

    function updateLayerUri(uri: string | undefined): string | undefined {
      if (uri == null) return uri;
      if (uri.startsWith('im_')) return uri;
      const record = imagery.find((f) => f.uri === uri)?.id; ///
      if (record == null) throw new Error('Unable to find imagery id for uri:' + uri);
      return record;
    }

    const layers = [];
    // Map the configuration sources into imagery ids
    for (const l of this.config.layers) {
      const layer = { ...l };
      layers.push(layer);

      if (type === TileSetType.Raster) {
        if (layer[2193]) layer[2193] = updateLayerUri(layer[2193]);
        if (layer[3857]) layer[3857] = updateLayerUri(layer[3857]);
      }
    }

    const tileSet: ConfigTileSet = {
      type,
      id: this.getId(this.tag),
      name: Config.unprefix(Config.TileSet.prefix, this.config.id),
      layers,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
    };

    if (this.config.title) tileSet.title = this.config.title;
    if (this.config.description) tileSet.description = this.config.description;
    if (background) tileSet.background = background;

    return tileSet;
  }
}
