import { LogConfig } from '@basemaps/shared';
import { fsa } from '@chunkd/fs';
import spritezero, { ImgLayout } from '@mapbox/spritezero';
import { basename, dirname } from 'path';
import { promisify } from 'util';

/** Pixel ratios to generate 1x, 2x and 4x */
export const PixelRatio = [1, 2, 4];

const generateImage = promisify(spritezero.generateImage);
const generateLayout = promisify(spritezero.generateLayout);

async function main(): Promise<void> {
  const logger = LogConfig.get();
  const spriteList: Map<string, { svg: Buffer; id: string }[]> = new Map();

  for await (const fileName of fsa.list(`./config/sprites/`)) {
    if (!fileName.endsWith('.svg')) continue;

    const groupId = basename(dirname(fileName));
    const spriteId = basename(fileName).replace('.svg', '');

    logger.debug({ groupId, spriteId }, 'Svg:Found');

    const sprites = spriteList.get(groupId) ?? [];
    sprites.push({ id: spriteId, svg: await fsa.read(fileName) });
    spriteList.set(groupId, sprites);
  }

  for (const [groupId, imgs] of spriteList.entries()) {
    logger.info({ groupId, sprites: imgs.length }, 'Sprite:Create');

    for (const pixelRatio of PixelRatio) {
      const scaleText = pixelRatio === 1 ? '' : `@${pixelRatio}x`;
      const outputPng = `./config/sprites/${groupId}${scaleText}.png`;
      const outputJson = `./config/sprites/${groupId}${scaleText}.json`;

      const layout = await generateLayout({ imgs, pixelRatio, format: true });
      await fsa.write(outputJson, JSON.stringify(layout));

      const layoutImage = await generateLayout({ imgs, pixelRatio, format: false });
      const img = await generateImage(layoutImage as ImgLayout);
      await fsa.write(outputPng, img);
    }
  }
}

main();
