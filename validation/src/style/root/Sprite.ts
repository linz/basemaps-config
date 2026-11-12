import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#sprite
export const Sprite = z.string().optional();
