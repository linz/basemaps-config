import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigImagery } from '@basemaps/config';
import { Epsg } from '@basemaps/geo';
import { Production, S3fs, Updater } from './base.config';

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
  imagery: Set<string> = new Set<string>();

  async validation(): Promise<boolean> {
    // Validate existence of imagery in s3.
    const exist = await S3fs.list(this.config.uri);
    if (!(await (await exist.next()).value)) throw Error(`Imagery not exist in s3 ${this.config.uri}.`);

    // Cache all the valid imagery id for tile set validation.
    this.imagery.add(this.config.id);
    return true;
  }
  /**
   * Class to apply an ImageryConfig source to the tile metadata db
   * @param config a string or ImageryConfig to use
   */

  assertConfig(json: unknown): asserts json is ConfigImagerySchema {
    zImageConfig.parse(json);
  }

  async loadOldData(): Promise<ConfigImagery | null> {
    const oldData = await Config.Imagery.get(this.config.id);
    return oldData;
  }

  prepareNewData(oldData: ConfigImagery | null): ConfigImagery {
    const now = Date.now();

    // Tagging the id.
    let id = `${this.config.id}@${this.tag}`;
    if (this.tag === Production) {
      id = this.config.id;
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
    };
    return imagery;
  }

  async import(data: ConfigImagery): Promise<void> {
    this.logger.info({ id: data.id }, 'ImportImagery');
    if (this.isCommit) await Config.Imagery.put(data);
  }
}

export async function importImagery(tag: string, commit: boolean, logger: LogType): Promise<Set<string>> {
  const imagery: Set<string> = new Set<string>();
  const path = `config/imagery`;
  const filenames = await fs.readdir(path);
  const promises = [];
  for (const filename of filenames) {
    const file = `${path}/${filename}`;
    const updater = new ImageryUpdater(filename, (await fs.readFile(file)).toString(), tag, commit, logger);
    const promise = updater.reconcile();
    imagery.add(updater.config.id);
    promises.push(promise);
  }
  await Promise.all(promises);
  return imagery;
}
