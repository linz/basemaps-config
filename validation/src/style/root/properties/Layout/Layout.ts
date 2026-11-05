import { z } from 'zod';

import { IconImage } from './properties/IconImage.js';
import { TextFont } from './properties/TextFont.js';

export const Layout = z
  .object({
    'icon-image': IconImage,
    'text-font': TextFont,
  })
  .optional();
