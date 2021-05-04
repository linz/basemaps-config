import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { diff } from 'deep-diff';
import { ConfigTileSet, TileSetType } from '@basemaps/config';

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
  2193: z.string().optional(),
  3857: z.string().optional(),
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
export type TileSetConfigSchema = z.infer<typeof zTileSetConfig>;

export function assertTileSetConfig(json: unknown): asserts json is TileSetConfigSchema {
  zTileSetConfig.parse(json);
}

export class TileSetUpdater {
  config: TileSetConfigSchema;
  id: string;
  isCommit = false;
  logger: LogType;
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */
  constructor(config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    if (typeof config === 'string') config = JSON.parse(config);
    assertTileSetConfig(config);
    this.config = config;
    this.isCommit = isCommit;
    this.logger = logger;
    if (tag === 'master') {
      this.id = Config.TileSet.id(this.config.name);
    } else {
      this.id = Config.TileSet.id(`${this.config.name}@${tag}`);
    }
  }

  /**
   * Reconcile the differences between the config and the tile metadata DB and update if changed.
   */
  async reconcile(): Promise<void> {
    const tileSetId = Config.TileSet.id(this.config.name);
    const oldData = await Config.TileSet.get(tileSetId);

    // Prepare record from config file
    const newData = this.prepare(oldData);

    if (oldData == null) {
      // initialize if not exist
      this.import(newData);
    } else if (!this.showDiff(newData, oldData)) {
      // Update if different
      this.import(newData);
    }
  }

  /**
   * Prepare ConfigTileSet and import
   */
  prepare(tsData: ConfigTileSet | null): ConfigTileSet {
    const now = Date.now();
    let type = TileSetType.Raster;
    if (this.config.type === TileSetType.Vector) type = TileSetType.Vector;
    const tileset: ConfigTileSet = {
      type,
      id: this.id,
      name: this.config.name,
      background: parseRgba(this.config.background),
      layers: this.config.layers,
      createdAt: tsData ? tsData.createdAt : now,
      updatedAt: now,
    };
    return tileset;
  }

  showDiff(oldData: ConfigTileSet, newData: ConfigTileSet): boolean {
    const ignoredProperties = ['createdAt', 'updatedAt'];
    const changes = diff(oldData, newData, function (_path: string[], key: string) {
      return ignoredProperties.indexOf(key) >= 0;
    });
    if (changes) return true;
    return false;
  }

  /**
   * Prepare ConfigTileSet and import
   */
  async import(data: ConfigTileSet): Promise<void> {
    this.logger.info({ id: this.id }, 'ImportTileSet');
    if (this.isCommit) Config.TileSet.put(data);
  }
}

export async function importTileSet(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `./config/tileset`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const updater = new TileSetUpdater((await fs.readFile(filename)).toString(), tag, commit, logger);
    updater.reconcile();
  }
}
