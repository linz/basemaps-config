import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigImagery } from '@basemaps/config';
import { Epsg } from '@basemaps/geo';

const zBound = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const zFile = zBound.extend({
  name: z.string(),
});

const zImageConfig = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string(),
  projection: z.number(),
  year: z.number(),
  resolution: z.number(),
  bounds: zBound,
  files: z.array(zFile),
});

export type ImageConfig = z.infer<typeof zImageConfig>;

export function assertImageryConfig(json: unknown): asserts json is ImageConfig {
  zImageConfig.parse(json);
}

export class ImageryUpdater {
  config: ImageConfig;
  id: string;
  isCommit = false;
  logger: LogType;
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */
  constructor(config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    if (typeof config === 'string') config = JSON.parse(config);
    assertImageryConfig(config);
    this.config = config;
    this.isCommit = isCommit;
    this.logger = logger;
    if (tag === 'master') {
      this.id = Config.Provider.id(this.config.name);
    } else {
      this.id = Config.Provider.id(`${this.config.name}@${tag}`);
    }
  }

  /**
   * Reconcile the differences between the config and the tile metadata DB and update if changed.
   */
  async reconcile(): Promise<void> {
    const imageId = Config.Imagery.id(this.config.name);
    const imData = await Config.Imagery.get(imageId);

    // initialize if not exist
    if (imData == null) this.import(imData);

    // Update if different
    if (JSON.stringify(imData) !== JSON.stringify(this.config)) this.import(imData);
  }

  /**
   * Prepare ConfigTileSet and import
   * @param isCommit if true apply the differences to bring the DB in to line with the config file
   */
  async import(imData: ConfigImagery | null): Promise<void> {
    const now = Date.now();
    const projection = Epsg.parse(this.config.projection.toString());
    if (projection == null) throw Error(`Wrong Imagery projection for ${this.config.name}.`);

    const imagery: ConfigImagery = {
      id: this.id,
      name: this.config.name,
      projection: projection.code,
      uri: this.config.uri,
      year: this.config.year,
      resolution: this.config.resolution,
      bounds: this.config.bounds,
      files: this.config.files,
      createdAt: imData ? imData.createdAt : now,
      updatedAt: now,
      v: 1,
    };

    this.logger.info({ id: this.id }, 'ImportImagery');
    if (this.isCommit) Config.Imagery.put(imagery);
  }
}

export async function importImagery(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `config/imagery`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const updater = new ImageryUpdater((await fs.readFile(filename)).toString(), tag, commit, logger);
    updater.reconcile();
  }
}
