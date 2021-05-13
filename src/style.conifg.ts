import { ConfigVectorStyle, StyleJson } from '@basemaps/config';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
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
  async validation(): Promise<boolean> {
    return true;
  }
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
}

export async function importStyle(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `./config/style`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const file = `${path}/${filename}`;
    const updater = new StyleUpdater(filename, (await fs.readFile(file)).toString(), tag, commit, logger);
    await updater.reconcile();
  }
}
