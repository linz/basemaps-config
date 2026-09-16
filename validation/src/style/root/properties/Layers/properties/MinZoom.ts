import { z } from 'zod';

export const MinZoom = z
  .number()
  .refine((n) => 0 <= n && n <= 24)
  .optional();
