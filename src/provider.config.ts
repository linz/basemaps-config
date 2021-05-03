import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigProvider } from '@basemaps/config';

const zServiceIdentification = z.object({
  title: z.string(),
  description: z.string(),
  fees: z.string(),
  accessConstraints: z.string(),
});

const zAddress = z.object({
  deliveryPoint: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  email: z.string(),
});

const zContact = z.object({
  individualName: z.string(),
  position: z.string(),
  phone: z.string(),
  address: zAddress,
});

const zServiceProvider = z.object({
  name: z.string(),
  site: z.string(),
  contact: zContact,
});

const zProviderConfig = z.object({
  name: z.string(),
  serviceIdentification: zServiceIdentification,
  serviceProvider: zServiceProvider,
});

export type ProviderConfig = z.infer<typeof zProviderConfig>;

export function assertProviderConfig(json: unknown): asserts json is ProviderConfig {
  zProviderConfig.parse(json);
}

export class ProviderUpdater {
  config: ProviderConfig;
  id: string;
  isCommit = false;
  logger: LogType;
  /**
   * Class to apply an Provider source to the tile metadata db
   * @param config a string or Provider to use
   */
  constructor(config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    if (typeof config === 'string') config = JSON.parse(config);
    assertProviderConfig(config);
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
    const providerId = Config.Provider.id(this.config.name);
    const pvData = await Config.Provider.get(providerId);

    // initialize if not exist
    if (pvData == null) this.import(pvData);

    // Update if different
    if (JSON.stringify(pvData) !== JSON.stringify(this.config)) this.import(pvData);
  }

  /**
   * Prepare ConfigProvider and import
   * @param isCommit if true apply the differences to bring the DB in to line with the config file
   */
  async import(pvData: ConfigProvider | null): Promise<void> {
    const now = Date.now();

    const provider: ConfigProvider = {
      id: this.id,
      name: this.config.name,
      serviceIdentification: this.config.serviceIdentification,
      serviceProvider: this.config.serviceProvider,
      createdAt: pvData ? pvData.createdAt : now,
      updatedAt: now,
      version: 1,
    };
    this.logger.info({ id: this.id }, 'ImportProvider');
    if (this.isCommit) Config.Provider.put(provider);
  }
}

export async function importProvider(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `config/provider`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const updater = new ProviderUpdater((await fs.readFile(filename)).toString(), tag, commit, logger);
    updater.reconcile();
  }
}
