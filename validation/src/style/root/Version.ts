import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#version
export const Version = z.number().refine((n) => n === 8);
