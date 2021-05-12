import * as z from 'zod';
import { Config, LogType } from '@basemaps/shared';
import { promises as fs } from 'fs';
import { ConfigProvider } from '@basemaps/config';
import { Production, Updater } from './base.config';

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

export type ProviderConfigSchema = z.infer<typeof zProviderConfig>;

export class ProviderUpdater extends Updater<ProviderConfigSchema, ConfigProvider> {
  async validation(): Promise<boolean> {
    return true;
  }
  /**
   * Class to apply an Provider source to the tile metadata db
   * @param config a string or Provider to use
   */

  assertConfig(json: unknown): asserts json is ProviderConfigSchema {
    zProviderConfig.parse(json);
  }

  async loadOldData(): Promise<ConfigProvider | null> {
    const id = Config.Provider.id(this.config.name);
    const oldData = await Config.Provider.get(id);
    return oldData;
  }

  prepareNewData(oldData: ConfigProvider | null): ConfigProvider {
    const now = Date.now();

    // Tagging the id.
    let id = Config.Provider.id(`${this.config.name}@${this.tag}`);
    if (this.tag === Production) {
      id = Config.Provider.id(this.config.name);
    }

    const provider: ConfigProvider = {
      id,
      name: this.config.name,
      serviceIdentification: this.config.serviceIdentification,
      serviceProvider: this.config.serviceProvider,
      createdAt: oldData ? oldData.createdAt : now,
      updatedAt: now,
      version: 1,
    };

    return provider;
  }

  async import(data: ConfigProvider): Promise<void> {
    this.logger.info({ id: data.id }, 'ImportProvider');
    if (this.isCommit) Config.Provider.put(data);
  }
}

export async function importProvider(tag: string, commit: boolean, logger: LogType): Promise<void> {
  const path = `config/provider`;
  const filenames = await fs.readdir(path);
  for (const filename of filenames) {
    const file = `${path}/${filename}`;
    const updater = new ProviderUpdater(filename, (await fs.readFile(file)).toString(), tag, commit, logger);
    await updater.reconcile();
  }
}
