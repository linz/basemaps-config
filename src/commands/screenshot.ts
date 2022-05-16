import { GoogleTms, Nztm2000QuadTms } from '@basemaps/geo';
import { Config, LogConfig, LogType } from '@basemaps/shared';
import { Command, Flags } from '@oclif/core';
import { mkdir } from 'fs/promises';
import { chromium, Page } from 'playwright';

const TileTest = [
  { name: 'health3857-z5', tileMatrix: GoogleTms, location: { lat: -41.8899962, lng: 174.0492437, z: 5 }, tileSet: 'health', style: undefined },
  { name: 'health2193-z5', tileMatrix: Nztm2000QuadTms, location: { lat: 0, lng: 0, z: 0 }, tileSet: 'aerial' },
  { name: 'topographic-3857-z5', tileMatrix: GoogleTms, location: { lat: -41.8899962, lng: 174.0492437, z: 5 }, tileSet: 'topographic', style: 'topographic' },
  { name: 'topolite-3857-z5', tileMatrix: GoogleTms, location: { lat: -41.8899962, lng: 174.0492437, z: 5 }, tileSet: 'topographic', style: 'topolite' },
  { name: 'topolite-3857-z14', tileMatrix: GoogleTms, location: { lat: -41.8899962, lng: 174.0492437, z: 14 }, tileSet: 'topographic', style: 'topolite' },
];

export class CommandScreenShot extends Command {
  static description = 'Dump screenshots';

  static flags = {
    version: Flags.version(),
    help: Flags.help(),
    verbose: Flags.boolean({ description: 'Verbose logging', default: false }),
    host: Flags.string({ description: 'Host to use', default: 'basemaps.linz.govt.nz' }),
    tag: Flags.string({ char: 't', description: 'PR tag(PR-number) or "production"', default: 'production' }),
  };

  async run(): Promise<void> {
    const logger = LogConfig.get();
    const { flags } = await this.parse(CommandScreenShot);
    if (flags.verbose) logger.level = 'trace';

    logger.info('Page:Launch');
    const chrome = await chromium.launch();
    const page = await chrome.newPage();

    try {
      await this.takeScreenshots(page, logger);
    } finally {
      await page.close();
      await chrome.close();
    }
  }

  async takeScreenshots(page: Page, logger: LogType): Promise<void> {
    const { flags } = await this.parse(CommandScreenShot);

    for (const test of TileTest) {
      const tileSetId = await this.getTileSetId(test.tileSet, flags.tag);
      const styleId = await this.getStyleId(test.style, flags.tag);

      const searchParam = new URLSearchParams();
      searchParam.set('p', test.tileMatrix.identifier);
      searchParam.set('i', tileSetId);
      if (styleId) searchParam.set('s', styleId);

      const loc = `${test.location.lng},${test.location.lat},z${test.location.z}`;
      const fileName = '.artifacts/visual-snapshots/' + flags.host + '_' + test.name + '.png';

      await mkdir(`.artifacts/visual-snapshots/`, { recursive: true });

      const url = `https://${flags.host}/?${searchParam.toString()}&debug=true&debug.screenshot=true#${loc}`;

      logger.info({ url, expected: fileName }, 'Page:Load');

      await page.goto(url);

      if (flags.host.startsWith('dev')) {
        await page.waitForSelector('div#map-loaded', { state: 'attached' });
        await page.waitForTimeout(2_500);
      } else {
        throw new Error('Not supported on production yet');
      }
      await page.screenshot({ path: fileName });

      logger.info({ url, expected: fileName }, 'Page:Load:Done');
    }
  }

  async getTileSetId(tileSetId: string, tag: string): Promise<string> {
    if (tag === 'production') return tileSetId;

    const tileSetTagId = `${tileSetId}@${tag}`;
    const dbId = Config.TileSet.id(tileSetTagId);
    const tileSet = await Config.TileSet.get(dbId);

    if (tileSet) return tileSetTagId;
    return tileSetId;
  }

  async getStyleId(styleId: string | undefined, tag: string): Promise<string> {
    if (styleId == null) return '';
    if (tag === 'production') return styleId ?? '';

    const styleIdTagId = `${styleId}@${tag}`;
    const dbId = Config.Style.id(styleIdTagId);
    const style = await Config.Style.get(dbId);
    if (style) return styleIdTagId;
    return styleId;
  }
}
