import { ConfigVectorStyle, StyleJson } from '@basemaps/config';
import { Config } from '@basemaps/shared';
import * as z from 'zod';
import { Updater } from './base.config';

const zStyleJson = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  metadata: z.unknown().optional(),
  sprite: z.string().optional(),
  glyphs: z.string().optional(),
  sources: z.unknown(),
  layers: z.array(z.unknown()),
});

export type StyleJsonConfigSchema = z.infer<typeof zStyleJson>;

export class StyleUpdater extends Updater<StyleJsonConfigSchema, ConfigVectorStyle> {
  db = Config.Style;

  /**
   * Class to apply an StyleJsonConfig source to the tile metadata db
   * @param config a string or StyleJsonConfig to use
   */

  assertConfig(json: unknown): asserts json is StyleJsonConfigSchema {
    zStyleJson.parse(json);
  }

  prepareNewData(oldData: ConfigVectorStyle | null): ConfigVectorStyle {
    const now = Date.now();

    const style: ConfigVectorStyle = {
      id: this.getId(this.tag),
      name: this.config.name,
      style: this.config as StyleJson,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
    };

    return style;
  }

  invalidatePath(): string {
    return `v1/togographic/style/${this.config.name}.json`;
  }
}
