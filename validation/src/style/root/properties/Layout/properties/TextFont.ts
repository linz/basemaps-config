import { z } from 'zod';

import { Fonts } from '../../../../../providers/Fonts.js';

const fontName = z.string().refine(
  (s) => Fonts.verify(s),
  (s) => ({
    message: `Font '${s}' not found.`,
  }),
);

export const TextFont = z.array(fontName).optional();
