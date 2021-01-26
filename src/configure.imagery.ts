import { LogConfig, LoggerFatalError } from '@basemaps/shared';
import { CommandLineParser } from '@rushstack/ts-command-line';
import { PrettyTransform } from 'pretty-json-log';
import { ConfigImageryImportAction } from './action.config.imagery';

export class ConfigureImageryCommandLine extends CommandLineParser {
  constructor() {
    super({
      toolFilename: 'configureImagery',
      toolDescription: 'Configure how imagery is used within basemaps',
    });
    this.addAction(new ConfigImageryImportAction());

    if (process.stdout.isTTY) {
      LogConfig.setOutputStream(PrettyTransform.stream());
    }
  }

  protected onExecute(): Promise<void> {
    // If the console is a tty pretty print the output
    if (process.stdout.isTTY) {
      LogConfig.setOutputStream(PrettyTransform.stream());
    }

    return super.onExecute();
  }
  protected onDefineParameters(): void {
    // Nothing
  }

  public run(): void {
    this.executeWithoutErrorHandling().catch((err) => {
      if (err instanceof LoggerFatalError) {
        LogConfig.get().fatal(err.obj, err.message);
      } else {
        LogConfig.get().fatal({ err }, 'Failed to run command');
      }
      process.exit(1);
    });
  }
}

new ConfigureImageryCommandLine().run();
