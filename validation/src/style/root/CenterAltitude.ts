import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#centeraltitude
export const CenterAltitude = z.number().optional();
