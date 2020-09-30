import { BaseCommandLine } from '@basemaps/cli/build/cli/base.cli';
import { LogConfig } from '@basemaps/shared';
import { PrettyTransform } from 'pretty-json-log';
import { ConfigImageryImportAction } from './action.config.imagery';

export class ConfigureImageryCommandLine extends BaseCommandLine {
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
}

new ConfigureImageryCommandLine().run();
