import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigTileSet, TileSetType } from '@basemaps/config';
import { Production, Updater } from './base.config';

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

const zImageryLayer = z
  .object({
    minZoom: zZoom.optional(),
    maxZoom: zZoom.optional(),
  })
  .refine(({ minZoom, maxZoom }) => (minZoom ?? ImageryConfigDefaults.minZoom) <= (maxZoom ?? ImageryConfigDefaults.maxZoom), {
    message: 'minZoom may no be greater than maxZoom',
    path: ['minZoom'],
  });

const zLayerConfig = zImageryLayer.extend({
  name: z.string(),
  2193: z.string().optional(),
  3857: z.string().optional(),
});

const zTileSetConfig = z.object({
  type: z.string(),
  name: z.string(),
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
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */

  assertConfig(json: unknown): asserts json is TileSetConfigSchema {
    const validate = zTileSetConfig.parse(json);
    if (!validate) throw Error('Invalidate Type');
  }

  async loadOldData(): Promise<ConfigTileSet | null> {
    const id = Config.TileSet.id(this.config.name);
    const oldData = await Config.TileSet.get(id);
    return oldData;
  }

  prepareNewData(oldData: ConfigTileSet | null): ConfigTileSet {
    const now = Date.now();

    // Get the type of tileset, Default Raster
    let type = TileSetType.Raster;
    if (this.config.type === TileSetType.Vector) type = TileSetType.Vector;

    // Prepare background if exists
    const background = this.config.background ? parseRgba(this.config.background) : null;

    // Tagging the id.
    let id = Config.TileSet.id(`${this.config.name}@${this.tag}`);
    if (this.tag === Production) {
      id = Config.TileSet.id(this.config.name);
    }

    const tileSet: ConfigTileSet = {
      type,
      id,
      name: this.config.name,
      layers: this.config.layers,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
    };

    if (this.config.title) tileSet.title = this.config.title;
    if (this.config.description) tileSet.description = this.config.description;
    if (background) tileSet.background = background;

    return tileSet;
  }

  /**
   * Prepare ConfigTileSet and import
   */
  async import(data: ConfigTileSet): Promise<void> {
    this.logger.info({ id: data.id }, 'ImportTileSet');
    if (this.isCommit) Config.TileSet.put(data);
  }
}

export async function importTileSet(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `./config/tileset`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const file = `${path}/${filename}`;
    const updater = new TileSetUpdater(filename, (await fs.readFile(file)).toString(), tag, commit, logger);
    await updater.reconcile();
  }
}
