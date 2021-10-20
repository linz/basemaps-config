import { Bounds, TileMatrixSets } from '@basemaps/geo';
import { Config, extractYearRangeFromName, fsa, LogConfig, Projection } from '@basemaps/shared';
import { Command, flags } from '@oclif/command';
import * as z from 'zod';
import { ConfigImagerySchema, zImageConfig, zNamedBounds } from './imagery.config.js';

const zJob = z.object({
  id: z.string(),
  name: z.string(),
  output: z.object({
    gsd: z.number(),
    tileMatrix: z.string(),
    files: z.array(zNamedBounds),
  }),
});

const ResolutionRegex = /((?:\d[\.\-])?\d+)m/;
/**
 * Attempt to parse a resolution from a imagery name
 * @example `wellington_urban_2017_0.10m` -> 100
 * @param name Imagery name to parse
 * @returns resolution (millimeters), -1 for failure to parse
 * TODO this is part of `@basemaps/cli` import once it is moved to shared
 */
export function extractResolutionFromName(name: string): number {
  const matches = name.match(ResolutionRegex);
  if (matches == null) return -1;
  return parseFloat(matches[1].replace('-', '.')) * 1000;
}

export class CommandImportImagery extends Command {
  static description = 'Import imagery from job';

  static flags = {
    commit: flags.boolean({ description: 'Actually run job' }),
  };
  static args = [{ name: 'file', description: 'Job location', required: true }];

  promises: Promise<boolean>[] = [];
  imagery = new Set<string>();
  invalidates: string[] = [];

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags, args } = this.parse(CommandImportImagery);

    if (!args.file.endsWith('job.json')) args.file = fsa.join(args.file, 'job.json');

    logger.info({ path: args.file }, 'Job:Fetch');
    const jobJson = await fsa.readJson(args.file);

    const job = zJob.passthrough().parse(jobJson);
    const year = extractYearRangeFromName(job.name);
    if (year == null) {
      logger.fatal({ imagery: job.name }, 'Failed to extract year from imagery name');
      return;
    }

    const resolution = extractResolutionFromName(job.name);
    if (resolution == null) {
      logger.fatal({ imagery: job.name }, 'Failed to extract resolution from imagery name');
      return;
    }

    const tileMatrix = TileMatrixSets.find(job.output.tileMatrix);
    if (tileMatrix == null) {
      logger.fatal({ tileMatrix: job.output.tileMatrix }, 'Failed to find matching tileMatrix');
      return;
    }

    const bounds = Bounds.union(job.output.files);

    const imgConfig: ConfigImagerySchema = {
      name: job.name,
      id: Config.Imagery.id(job.id),
      uri: args.file.replace('/job.json', ''),
      year: year[0],
      projection: tileMatrix.projection.code,
      resolution,
      bounds,
      tileMatrix: job.output.tileMatrix,
      files: job.output.files,
    };

    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const proj = Projection.get(tileMatrix);
    const centerLatLon = proj.toWgs84([center.x, center.y]).map((c) => c.toFixed(6));
    const targetZoom = Math.max(tileMatrix.findBestZoom(job.output.gsd) - 12, 0);

    const url = `https://basemaps.linz.govt.nz/?p=${tileMatrix.identifier}&i=${job.id}#@${centerLatLon[1]},${centerLatLon[0]},z${targetZoom}`;

    logger.info({ img: job.name, url }, 'Url');
    zImageConfig.parse(imgConfig);
    const targetFileName = `./config/imagery/${job.name}-${tileMatrix.identifier}.json`;

    logger.info({ path: targetFileName, files: job.output.files.length }, 'Imported');
    if (flags.commit !== true) logger.info('DryRun:Done');
    else fsa.writeJson(targetFileName, imgConfig);
  }
}
