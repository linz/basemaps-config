import { z } from 'zod';

export const Type = z.union([
  z.literal('fill'),
  z.literal('line'),
  z.literal('symbol'),
  z.literal('circle'),
  z.literal('heatmap'),
  z.literal('fill-extrusion'),
  z.literal('raster'),
  z.literal('hillshade'),
  z.literal('background'),
]);
