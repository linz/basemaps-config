import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#roll
export const Roll = z.number().optional();
