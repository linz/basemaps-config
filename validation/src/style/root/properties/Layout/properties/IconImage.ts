import { z } from 'zod';

import { Sprites } from '../../../../../providers/Sprites.js';

const spriteName = z.string().refine(
  (s) => Sprites.verify(s),
  (s) => ({
    message: `Sprite '${s}' not found.`,
  }),
);

export const IconImage = z
  .union([
    spriteName,
    z.object({
      stops: z.array(z.tuple([z.number(), spriteName])),
    }),
  ])
  .optional();
