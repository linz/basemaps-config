import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#pitch
export const Pitch = z
  .number()
  .refine((n) => 0 <= n && n <= 60)
  .optional();
