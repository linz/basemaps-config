/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { updateConfig } from '@basemaps/cli';
import { defineTagParameter } from '@basemaps/cli/build/cli/basemaps/tileset.util';
import { LogConfig, parseMetadataTag } from '@basemaps/shared';
import { CommandLineAction, CommandLineFlagParameter, CommandLineStringParameter } from '@rushstack/ts-command-line';

const imageryConfigFileRe = /^config\/imagery\/[^./]+.json$/;

export class ConfigImageryImportAction extends CommandLineAction {
    private tag: CommandLineStringParameter;
    private commit: CommandLineFlagParameter;

    public constructor() {
        super({
            actionName: 'import',
            summary: 'Import imagery and tileset rules from a config file streamed to STDIN',
            documentation: '',
        });
    }

    protected onDefineParameters(): void {
        defineTagParameter(this);
        this.commit = this.defineFlagParameter({
            parameterLongName: '--commit',
            description: 'Commit to database',
            required: false,
        });
    }

    protected async onExecute(): Promise<void> {
        const tagInput = this.tag.value!;
        const isCommit = !!this.commit.value;

        const tag = parseMetadataTag(tagInput);
        if (tag == null) {
            LogConfig.get().fatal({ tag }, 'Invalid tag name');
            console.log(this.renderHelpText());
            return;
        }

        if (process.stdin.isTTY) {
            LogConfig.get().fatal({ tag }, 'STDIN missing');
            console.log(this.renderHelpText());
            return;
        }

        const files = (
            await new Promise<string>((resolve, reject) => {
                let data = '';
                const { stdin } = process;
                stdin.on('error', (err) => {
                    reject(err);
                });
                stdin.on('data', (chunk) => {
                    data += chunk.toString();
                });
                stdin.on('end', () => {
                    resolve(data);
                });
            })
        )
            .split(/\s+/)
            .filter((f) => imageryConfigFileRe.test(f));

        const logger = LogConfig.get();

        for (const configFile of files) {
            LogConfig.set(logger.child({ configFile }));
            await updateConfig(configFile, tag, isCommit);
        }
    }
}
