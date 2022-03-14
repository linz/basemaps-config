import { Command, Flags } from '@oclif/core';
import { fsa } from '@chunkd/fs';
import { LogConfig } from '@basemaps/shared';
import { basename, dirname } from 'path';
import { Command as DockerCommand } from '@linzjs/docker-command';
import pLimit from 'p-limit';
import { uploadStaticFile } from '@basemaps/cli/build/cli/util.js';
const Q = pLimit(10);

function isFont(f: string): boolean {
  return f.toLowerCase().endsWith('.ttf') || f.toLowerCase().endsWith('.otf');
}

// TODO would be good to run this inside of a container if rust is not installed
const buildFonts = new DockerCommand('build_pbf_glyphs');

export class CommandImportFonts extends Command {
  static description = 'Import fonts';

  static flags = {
    version: Flags.version(),
    help: Flags.help(),
    commit: Flags.boolean({ description: 'Actually import fonts' }),
    verbose: Flags.boolean({ description: 'Verbose logging', default: false }),
  };

  async run(): Promise<void> {
    const logger = LogConfig.get();

    const { flags } = await this.parse(CommandImportFonts);
    if (flags.verbose) logger.level = 'trace';
    const fonts = await fsa.toArray(fsa.list('./config/fonts'));

    const fontFolders = new Set<string>();
    for (const f of fonts) {
      // Only TTF and OTF font types are supported
      if (!isFont(f)) continue;
      fontFolders.add(dirname(f));
    }

    logger.info({ folders: fontFolders.size }, 'Font:Processing');

    const outputPath = './build/glyphs';

    // convert the fonts into protobuf files
    for (const folder of fontFolders) {
      logger.debug({ folder }, 'Font:Process');
      const output = await buildFonts.create().arg(folder).arg(outputPath).run();

      if (output.stderr) {
        logger.error({ folder, stderr: output.stderr }, 'Font:Process:Failed');
        return;
      }

      logger.info({ folder, duration: output.duration }, 'Font:Process:Done');
    }

    const allFontNames: Set<string> = new Set();
    const allFiles = await fsa.toArray(fsa.list(outputPath));

    const promises: Promise<unknown>[] = [];
    for (const file of allFiles) {
      if (!file.endsWith('.pbf')) continue;
      const targetPath = file.slice(file.lastIndexOf('build/') + 'build/'.length);
      allFontNames.add(basename(dirname(targetPath)));

      if (flags.commit) {
        // Upload files
        promises.push(
          Q(async () => {
            const isChanged = await uploadStaticFile(file, targetPath, 'application/protobuf;', 'public, max-age=3600, stale-while-revalidate=3600');
            if (isChanged) logger.info({ targetPath, isChanged }, 'Font:Upload');
            else logger.trace({ targetPath, isChanged }, 'Font:Upload');
          }),
        );
      }
    }

    await Promise.all(promises);
    // Create a summary glyphs.json
    await fsa.write('./build/glyphs/glyphs.json', JSON.stringify([...allFontNames]));
    if (flags.commit) await uploadStaticFile('./build/glyphs/glyphs.json', 'glyphs/glyphs.json', 'application/json', 'public, max-age=60, stale-while-revalidate=300');

    logger.info({ fonts: [...allFontNames], files: promises.length }, 'Font:Done');
  }
}
