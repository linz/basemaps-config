import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigVectorStyle, StyleJson } from '@basemaps/config';
import { Production, Updater } from './base.config';

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

  async loadOldData(): Promise<ConfigVectorStyle | null> {
    const id = Config.Style.id(this.config.name);
    const oldData = await Config.Style.get(id);
    return oldData;
  }

  prepareNewData(oldData: ConfigVectorStyle | null): ConfigVectorStyle {
    const now = Date.now();

    // Tagging the id.
    let id = Config.Style.id(`${this.config.name}@${this.tag}`);
    if (this.tag === Production) {
      id = Config.Style.id(this.config.name);
    }

    const style: ConfigVectorStyle = {
      id,
      name: this.config.name,
      style: this.config as StyleJson,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
    };

    return style;
  }

  /**
   * Prepare ConfigVectorStyle and import
   * @param isCommit if true apply the differences to bring the DB in to line with the config file
   */
  async import(data: ConfigVectorStyle): Promise<void> {
    this.logger.info({ id: data.id }, 'ImportStyle');
    if (this.isCommit) Config.Style.put(data);
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
