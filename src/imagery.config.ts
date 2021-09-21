import { ConfigImagery } from '@basemaps/config';
import { Epsg } from '@basemaps/geo';
import { Config, fsa } from '@basemaps/shared';
import * as z from 'zod';
import { Updater } from './base.config.js';

export const zBound = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });

export const zNamedBounds = zBound.extend({ name: z.string() });

export const zImageConfig = z.object({
  id: z.string(),
  tileMatrix: z.string().optional(),
  name: z.string(),
  uri: z.string(),
  projection: z.number(),
  year: z.number(),
  resolution: z.number(),
  bounds: zBound,
  files: z.array(zNamedBounds),
});

export type ConfigImagerySchema = z.infer<typeof zImageConfig>;

export class ImageryUpdater extends Updater<ConfigImagerySchema, ConfigImagery> {
  db = Config.Imagery;

  async isValid(): Promise<boolean> {
    // Validate existence of imagery in s3.
    const currentImagery = new Set(this.config.files.map((c) => fsa.join(this.config.uri, c.name) + '.tiff'));
    const imagery = await fsa.list(this.config.uri);
    for await (const img of imagery) currentImagery.delete(img);

    if (currentImagery.size > 0) {
      for (const uri of currentImagery) this.logger.fatal({ uri }, 'MissingImages');
      return false;
    }

    return true;
  }
  /**
   * Class to apply an ImageryConfig source to the tile metadata db
   * @param config a string or ImageryConfig to use
   */

  assertConfig(json: unknown): asserts json is ConfigImagerySchema {
    zImageConfig.parse(json);
  }

  prepareNewData(oldData: ConfigImagery | null): ConfigImagery {
    const now = Date.now();

    const projection = Epsg.parse(this.config.projection.toString());
    if (projection == null) throw Error(`Wrong Imagery projection for ${this.config.name}.`);

    const imagery: ConfigImagery = {
      id: this.getId(this.tag),
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
}
