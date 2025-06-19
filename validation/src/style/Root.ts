import { z } from 'zod';

import { Bearing } from './root/Bearing.js';
import { Center } from './root/Center.js';
import { CenterAltitude } from './root/CenterAltitude.js';
import { Glyphs } from './root/Glyphs.js';
import { Light } from './root/Light.js';
import { Name } from './root/Name.js';
import { Pitch } from './root/Pitch.js';
import { Projection } from './root/Projection.js';
import { Layers } from './root/properties/Layers/Layers.js';
import { Metadata } from './root/properties/Layers/properties/Metadata.js';
import { Roll } from './root/Roll.js';
import { Sky } from './root/Sky.js';
import { Sources } from './root/Sources.js';
import { Sprite } from './root/Sprite.js';
import { Terrain } from './root/Terrain.js';
import { Transition } from './root/Transition.js';
import { Version } from './root/Version.js';
import { Zoom } from './root/Zoom.js';

/**
 * Root
 *
 * @description Root level properties of a MapLibre style specify the map's layers, tile sources and other resources, and default values for the initial camera position when not specified elsewhere.
 *
 * @example {
 *   "version": 8,
 *   "name": "MapLibre Demo Tiles",
 *   "sprite": "https://demotiles.maplibre.org/styles/osm-bright-gl-style/sprite",
 *   "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
 *   "sources": {...},
 *   "layers": [...]
 * }
 *
 * @link https://maplibre.org/maplibre-style-spec/root/#root
 */
export const Root = z.object({
  version: Version,
  name: Name,
  metadata: Metadata, // shared
  center: Center,
  centerAltitude: CenterAltitude,
  zoom: Zoom,
  bearing: Bearing,
  pitch: Pitch,
  roll: Roll,
  light: Light,
  sky: Sky,
  projection: Projection,
  terrain: Terrain,
  sources: Sources,
  sprite: Sprite,
  glyphs: Glyphs,
  transition: Transition,
  layers: Layers,
});

export type RootType = z.infer<typeof Root>;
