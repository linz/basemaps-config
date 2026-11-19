import { z } from 'zod';

export const MaxZoom = z
  .number()
  .refine((n) => 0 <= n && n <= 24)
  .optional();
