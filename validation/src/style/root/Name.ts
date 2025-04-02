import { z } from 'zod';

/**
 * name
 *
 * @type {string | undefined}
 *
 * @description A human-readable name for the style.
 *
 * @example name: "Bright"
 *
 * @link https://maplibre.org/maplibre-style-spec/root/#name
 */
export const Name = z.string().optional();
