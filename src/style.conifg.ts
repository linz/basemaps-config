import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigVectorStyle, StyleJson } from '@basemaps/config';

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

export type StyleJsonConfig = z.infer<typeof zStyleJson>;

export function assertStyleConfig(json: unknown): asserts json is StyleJsonConfig {
  zStyleJson.parse(json);
}

export class StyleUpdater {
  config: StyleJsonConfig;
  id: string;
  isCommit = false;
  logger: LogType;
  /**
   * Class to apply an StyleJsonConfig source to the tile metadata db
   * @param config a string or StyleJsonConfig to use
   */
  constructor(config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    assertStyleConfig(config);
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
    const styleId = Config.Style.id(this.config.name);
    const stData = await Config.Style.get(styleId);

    // initialize if not exist
    if (stData == null) this.import(stData);

    // Update if different
    if (JSON.stringify(stData) !== JSON.stringify(this.config)) this.import(stData);
  }

  /**
   * Prepare ConfigVectorStyle and import
   * @param isCommit if true apply the differences to bring the DB in to line with the config file
   */
  async import(stData: ConfigVectorStyle | null): Promise<void> {
    const now = Date.now();

    const style: ConfigVectorStyle = {
      id: this.id,
      name: this.config.name,
      style: this.config as StyleJson,
      createdAt: stData ? stData.createdAt : now,
      updatedAt: now,
    };
    this.logger.info({ id: this.id }, 'ImportStyle');
    if (this.isCommit) Config.Style.put(style);
  }
}

export async function importStyle(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `./config/style`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const updater = new StyleUpdater((await fs.readFile(filename)).toString(), tag, commit, logger);
    updater.reconcile();
  }
}
