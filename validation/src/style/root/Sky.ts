import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#sky (TODO)
export const Sky = z.object({}).optional();
