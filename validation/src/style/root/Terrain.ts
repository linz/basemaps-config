import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#terrain
export const Terrain = z.object({}).optional();
