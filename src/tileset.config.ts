import { ConfigTileSet, TileSetType } from '@basemaps/config';
import { Config, fsa } from '@basemaps/shared';
import * as z from 'zod';
import { Updater } from './base.config';

/**
 * Parse a string as hex, return 0 on failure
 * @param str string to parse
 */
function parseHex(str: string): number {
  if (str === '') return 0;
  const val = parseInt(str, 16);
  if (isNaN(val)) {
    throw new Error('Invalid hex byte: ' + str);
  }
  return val;
}

/**
 * Parse a hexstring into RGBA
 *
 * Defaults to 0 if missing values
 * @param str string to parse
 */
export function parseRgba(str: string): { r: number; g: number; b: number; alpha: number } {
  if (str.startsWith('0x')) str = str.slice(2);
  else if (str.startsWith('#')) str = str.slice(1);
  if (str.length !== 6 && str.length !== 8) {
    throw new Error('Invalid hex color: ' + str);
  }
  return {
    r: parseHex(str.substr(0, 2)),
    g: parseHex(str.substr(2, 2)),
    b: parseHex(str.substr(4, 2)),
    alpha: parseHex(str.substr(6, 2)),
  };
}

function validateColor(str: string): boolean {
  try {
    parseRgba(str);
    return true;
  } catch (err) {
    return false;
  }
}

const zBackground = z.string().refine(validateColor, { message: 'Invalid hex color' });

export const ImageryConfigDefaults = {
  minZoom: 0,
  maxZoom: 32,
};

const zZoom = z.number().refine((val) => val >= ImageryConfigDefaults.minZoom && val <= ImageryConfigDefaults.maxZoom, {
  message: `must be between ${ImageryConfigDefaults.minZoom} and ${ImageryConfigDefaults.maxZoom}`,
});

const zLayerConfig = z
  .object({
    name: z.string(),
    2193: z.string().optional(),
    3857: z.string().optional(),
    minZoom: zZoom.optional(),
    maxZoom: zZoom.optional(),
  })
  .refine(({ minZoom, maxZoom }) => (minZoom ? minZoom : ImageryConfigDefaults.minZoom) <= (maxZoom ? maxZoom : ImageryConfigDefaults.maxZoom), {
    message: 'minZoom may no be greater than maxZoom',
    path: ['minZoom'],
  });

const zTileSetConfig = z.object({
  type: z.string(),
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  background: zBackground.optional(),
  layers: z.array(zLayerConfig),
});

/**
 *  The Configuration for all the imagery in a TileSet
 */
export type TileSetConfigSchema = z.infer<typeof zTileSetConfig>;

export class TileSetUpdater extends Updater<TileSetConfigSchema, ConfigTileSet> {
  db = Config.TileSet;
  imagery: Set<string>;

  constructor(filename: string, config: unknown, tag: string, isCommit: boolean, imagery: Set<string>) {
    super(filename, config, tag, isCommit);
    this.imagery = imagery;
  }

  invalidateError(id: string, name: string): void {
    throw Error(`Imagery:${id}-${name} from TileSet:${this.config.id} does not exist.`);
  }

  async isValid(): Promise<boolean> {
    // Validate the existence of imageries
    for (const layer of this.config.layers) {
      const name = layer.name;
      if (this.config.type === TileSetType.Raster) {
        if (layer[2193] && !this.imagery.has(layer[2193])) this.invalidateError(layer[2193], name);
        if (layer[3857] && !this.imagery.has(layer[3857])) this.invalidateError(layer[3857], name);
      } else {
        if (layer[2193] && !(await fsa.exists(layer[2193]))) this.invalidateError(layer[2193], name);
        if (layer[3857] && !(await fsa.exists(layer[3857]))) this.invalidateError(layer[3857], name);
      }
    }
    return true;
  }
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */

  assertConfig(json: unknown): asserts json is TileSetConfigSchema {
    const validate = zTileSetConfig.parse(json);
    if (!validate) throw Error('Invalidate Type');
  }

  prepareNewData(oldData: ConfigTileSet | null): ConfigTileSet {
    const now = Date.now();

    // Get the type of tileset, Default Raster
    let type = TileSetType.Raster;
    if (this.config.type === TileSetType.Vector) type = TileSetType.Vector;

    // Prepare background if exists
    const background = this.config.background ? parseRgba(this.config.background) : null;

    const tileSet: ConfigTileSet = {
      type,
      id: this.getId(this.tag),
      name: Config.unprefix(this.db.prefix, this.config.id),
      layers: this.config.layers,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
    };

    if (this.config.title) tileSet.title = this.config.title;
    if (this.config.description) tileSet.description = this.config.description;
    if (background) tileSet.background = background;

    return tileSet;
  }

  invalidatePath(): string {
    const name = Config.unprefix(this.db.prefix, this.config.id);
    if (this.config.type === TileSetType.Raster) return `/v1/tiles/${name}/*`;
    return `/v1/tiles/${name}/*.pbf`;
  }
}
