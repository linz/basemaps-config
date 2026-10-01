import { z } from 'zod';

// https://maplibre.org/maplibre-style-spec/root/#transition
export const Transition = z.object({}).optional();
