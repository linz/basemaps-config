import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#bearing
export const Bearing = z
  .number()
  .refine((n) => -180 < n && n <= 180)
  .optional();
