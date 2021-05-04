import { LogType } from '@basemaps/shared';
import { diff } from 'deep-diff';

export const ignoredProperties = ['id', 'createdAt', 'updatedAt'];

export abstract class Updater<S, T> {
  config: S;
  tag: string;
  isCommit = false;
  logger: LogType;
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */
  constructor(config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    if (typeof config === 'string') config = JSON.parse(config);
    this.assertConfig(config);
    this.config = config;
    this.tag = tag;
    this.isCommit = isCommit;
    this.logger = logger;
  }

  abstract assertConfig(config: unknown): asserts config is S;

  abstract loadOldData(): Promise<T | null>;

  abstract prepareNewData(oldData: T | null): T;

  abstract import(newData: T): void;

  /**
   * Reconcile the differences between the config and the tile metadata DB and update if changed.
   */
  async reconcile(): Promise<void> {
    const oldData = await this.loadOldData();
    const newData = this.prepareNewData(oldData);

    if (oldData == null) {
      // initialize if not exist
      this.import(newData);
    } else if (!this.showDiff(newData, oldData)) {
      // Update if different
      this.import(newData);
    }
  }

  showDiff(oldData: T, newData: T): boolean {
    const changes = diff(oldData, newData, (_path: string[], key: string) => {
      return ignoredProperties.indexOf(key) >= 0;
    });
    if (changes) return true;
    return false;
  }
}
