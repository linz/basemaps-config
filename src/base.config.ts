import { LogType } from '@basemaps/shared';
import { diff, Diff } from 'deep-diff';
import * as c from 'ansi-colors';

export const ignoredProperties = ['id', 'createdAt', 'updatedAt'];

export abstract class Updater<S, T> {
  config: S;
  filename: string;
  tag: string;
  isCommit: boolean;
  logger: LogType;
  /**
   * Class to apply an TileSetConfig source to the tile metadata db
   * @param config a string or TileSetConfig to use
   */
  constructor(filename: string, config: unknown, tag: string, isCommit: boolean, logger: LogType) {
    this.filename = filename;
    if (typeof config === 'string') config = JSON.parse(config);
    this.assertConfig(config);
    this.config = config;
    this.tag = tag;
    this.isCommit = isCommit ? isCommit : false;
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
    } else if (this.showDiff(oldData, newData)) {
      // Update if different
      this.import(newData);
    }
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
    const changes = diff(oldData, newData, (_path: string[], key: string) => {
      return ignoredProperties.indexOf(key) >= 0;
    });
    if (changes) {
      this.logger.info({ filename: this.filename }, 'Changes');
      const output = this.printDiff(changes);
      console.log(output);
      return true;
    }
    return false;
  }
}
