import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#zoom
export const Zoom = z.number().optional();
