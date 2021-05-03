import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';

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

const validateColor = (val: string): boolean => {
  try {
    parseRgba(val);
    return true;
  } catch (err) {
    return false;
  }
};

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
  [2193]: z.string().optional(),
  [3857]: z.string().optional(),
});

const zTileSetConfig = z.object({
  type: z.string(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  background: zBackground,
  layers: z.array(zLayerConfig),
});

/**
 *  The Configuration for all the imagery in a TileSet
 */
export type TileSetConfig = z.infer<typeof zTileSetConfig>;

export function assertTileSetConfig(json: unknown): asserts json is TileSetConfig {
  zTileSetConfig.parse(json);
}

export class TileSetUpdater {
  config: TileSetConfig;
  id: string;
  logger: LogType;
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */
  constructor(config: unknown, tag: string, logger: LogType) {
    if (typeof config === 'string') config = JSON.parse(config);
    assertTileSetConfig(config);
    this.config = config;
    if (tag === 'master') {
      this.id = Config.TileSet.id(this.config.name);
    } else {
      this.id = Config.TileSet.id(`${this.config.name}@${tag}`);
    }
  }

  /**
   * Reconcile the differences between the config and the tile metadata DB and update if changed.
   * @param isCommit if true apply the differences to bring the DB in to line with the config file
   */
  async reconcile(): Promise<boolean> {
    const tileSetId = Config.TileSet.id(this.config.name);
    const tsData = await Config.TileSet.get(tileSetId);
    // initialize if not exist
    if (tsData == null) {
      return true;
    } else {
    }
    return false;
  }
}

export async function importTileSet(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `config/tileset`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const updater = new TileSetUpdater((await fs.readFile(filename)).toString(), tag, logger);
    const change = updater.reconcile();
    if (change) logger.info({ file: filename }, 'ImportTileSet');
  }
}
