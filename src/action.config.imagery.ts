/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { LogConfig, TileMetadataTag } from '@basemaps/shared';
import { CommandLineAction, CommandLineStringParameter } from '@rushstack/ts-command-line';
// FIXME GJ import { defineTagParameter } from '@basemaps/cli/build/cli/basemaps/tileset.util';

/**
 * FIXME import from tile.metadata.base.ts
 */
export function parseMetadataTag(tagInput: string | null | undefined): any | null {
    if (tagInput == null) return null;
    switch (tagInput) {
        case TileMetadataTag.Head:
        case TileMetadataTag.Production:
        case TileMetadataTag.Beta:
            return tagInput;
        default:
            if (/^pr-[0-9]+$/.test(tagInput)) return tagInput;
            return null;
    }
}

const imageryConfigFileRe = /^config\/imagery\/[^./]+.json$/;

export class ConfigImageryImportAction extends CommandLineAction {
    private tag: CommandLineStringParameter;

    public constructor() {
        super({
            actionName: 'import',
            summary: 'Import imagery and tileset rules from a config file streamed to STDIN',
            documentation: '',
        });
    }

    protected onDefineParameters(): void {
        this.tag = this.defineStringParameter({
            argumentName: 'TAG',
            parameterLongName: '--tag',
            parameterShortName: '-t',
            description: `tag name  (options: ${['FIXME'].join(', ')} or pr-<pr_number>)`,
            required: true,
        });
    }

    protected async onExecute(): Promise<void> {
        const tagInput = this.tag.value!;

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

        for (const file of files) {
            console.log(`DEBUG file`, file);
        }
    }
}
