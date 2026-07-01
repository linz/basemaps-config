import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#light
export const Light = z
  .object({
    // https://maplibre.org/maplibre-style-spec/light/#anchor
    anchor: z.union([z.literal('map'), z.literal('viewport')]).optional(),

    // https://maplibre.org/maplibre-style-spec/light/#position (TODO)
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),

    // https://maplibre.org/maplibre-style-spec/light/#color (TODO)
    color: z.string().optional(),

    // https://maplibre.org/maplibre-style-spec/light/#intensity (TODO)
    intensity: z
      .number()
      .refine((n) => 0 <= n && n <= 1)
      .optional(),
  })
  .optional();
