import { BaseConfig, ConfigDynamoBase } from '@basemaps/config';
import { LogConfig, LogType, fsa } from '@basemaps/shared';
import * as c from 'ansi-colors';
import { diff, Diff } from 'deep-diff';

export const IgnoredProperties = ['id', 'createdAt', 'updatedAt'];

export const Production = 'production';

export abstract class Updater<S extends { id: string } = { id: string }, T extends BaseConfig = BaseConfig> {
  id: string;
  config: S;
  filename: string;
  tag: string;
  isCommit: boolean;
  logger: LogType;
  abstract db: ConfigDynamoBase<T>;

  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */
  constructor(filename: string, config: unknown, tag: string, isCommit: boolean) {
    this.filename = filename;

    if (typeof config === 'string') config = JSON.parse(config);
    this.assertConfig(config);

    this.config = config;
    this.tag = tag;
    this.isCommit = isCommit ? isCommit : false;
    this.logger = LogConfig.get().child({ file: filename });
    this.id = this.config.id;
  }

  abstract assertConfig(config: unknown): asserts config is S;
  abstract prepareNewData(oldData: T | null): T;

  invalidatePath?(): string;
  isValid?(): Promise<boolean>;

  getId(tag: string): string {
    if (tag === Production) return this.db.id(this.config.id);
    return this.db.id(`${this.config.id}@${tag}`);
  }

  /**
   * Reconcile the differences between the config and the tile metadata DB and update if changed.
   */
  async reconcile(): Promise<boolean> {
    if (!this.id.startsWith(this.db.prefix)) throw new Error(`Invalid id:${this.id}, missing prefix:${this.db.prefix}`);

    const oldData = await this.db.get(this.getId(Production));
    const newData = this.prepareNewData(oldData);

    if (oldData == null || this.showDiff(oldData, newData)) {
      const operation = oldData == null ? 'Insert' : 'Update';
      this.logger.info({ type: this.db.prefix, record: newData.id }, `Change:${operation}`);
      if (this.isCommit) await this.db.put(newData);
      return true;
    }
    this.logger.debug({ type: this.db.prefix, record: newData.id }, 'NoChanges');
    return false;
  }

  printDiff(changes: Diff<T, T>[]): string {
    let output = '';
    let isArray = false;
    for (const change of changes) {
      if (change.kind === 'A') {
        if (change.path) output += change.path.join();
        output += this.printDiff([change.item]);
        isArray = true; // Stop displaying the array changes for each line.
      } else {
        if (isArray) continue;
        if (change.kind === 'E') {
          if (change.path) output += change.path.join();
          output += c.green('\t+' + JSON.stringify(change.rhs));
          output += c.red('\t-' + JSON.stringify(change.lhs)) + '\n';
        } else if (change.kind === 'N') {
          if (change.path) output += change.path.join();
          output += c.green('\t+' + JSON.stringify(change.rhs)) + '\n';
        } else if (change.kind === 'D') {
          if (change.path) output += change.path.join();
          output += c.red('\t-' + JSON.stringify(change.lhs)) + '\n';
        }
      }
    }
    return output;
  }

  showDiff(oldData: T, newData: T): boolean {
    const changes = diff(oldData, newData, (_path: string[], key: string) => IgnoredProperties.indexOf(key) >= 0);
    if (changes) {
      this.logger.info({ type: this.db.prefix, record: newData.id }, 'Changes');
      const output = this.printDiff(changes);
      console.log(output);
      return true;
    }
    return false;
  }
}
