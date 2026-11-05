import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#projection (TODO)
export const Projection = z.object({}).optional();
