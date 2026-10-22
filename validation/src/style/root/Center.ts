import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#center
export const Center = z.tuple([z.number(), z.number()]).optional();
