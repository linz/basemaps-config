import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigImagery } from '@basemaps/config';
import { Epsg } from '@basemaps/geo';
import { Updater } from './base.config';

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

export type ConfigImagerySchema = z.infer<typeof zImageConfig>;

export class ImageryUpdater extends Updater<ConfigImagerySchema, ConfigImagery> {
  /**
   * Class to apply an ImageryConfig source to the tile metadata db
   * @param config a string or ImageryConfig to use
   */
  constructor(config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    super(config, tag, isCommit, logger);
  }

  assertConfig(json: unknown): asserts json is ConfigImagerySchema {
    zImageConfig.parse(json);
  }

  async loadOldData(): Promise<ConfigImagery | null> {
    const id = Config.Imagery.id(this.config.name);
    const oldData = await Config.Imagery.get(id);
    return oldData;
  }

  prepareNewData(oldData: ConfigImagery | null): ConfigImagery {
    const now = Date.now();

    // Tagging the id.
    let id = Config.Imagery.id(`${this.config.name}@${this.tag}`);
    if (this.tag === 'master') {
      id = Config.Imagery.id(this.config.name);
    }

    const projection = Epsg.parse(this.config.projection.toString());
    if (projection == null) throw Error(`Wrong Imagery projection for ${this.config.name}.`);

    const imagery: ConfigImagery = {
      id,
      name: this.config.name,
      projection: projection.code,
      uri: this.config.uri,
      year: this.config.year,
      resolution: this.config.resolution,
      bounds: this.config.bounds,
      files: this.config.files,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
      v: 1,
    };
    return imagery;
  }

  async import(data: ConfigImagery): Promise<void> {
    this.logger.info({ id: data.id }, 'ImportImagery');
    if (this.isCommit) Config.Imagery.put(data);
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
