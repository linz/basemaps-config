import { z } from 'zod';

import { Layout } from '../Layout/Layout.js';
import { Id } from './properties/Id.js';
import { MaxZoom } from './properties/MaxZoom.js';
import { Metadata } from './properties/Metadata.js';
import { MinZoom } from './properties/MinZoom.js';
import { Source } from './properties/Source.js';
import { Type } from './properties/Type.js';

const Layer = z
  .object({
    id: Id,
    type: Type,
    metadata: Metadata,
    source: Source,
    // source-layer
    minzoom: MinZoom,
    maxzoom: MaxZoom,
    // filter
    layout: Layout,
    // paint
  })
  .refine((layer) => {
    // https://maplibre.org/maplibre-style-spec/layers/#source
    if (layer.type !== 'background') {
      if (layer.source === undefined) {
        return false;
      }
    }

    return true;
  });

export const Layers = z.array(Layer).refine((layers) => {
  // check that all ids are unique
  const ids = new Set(layers.map((l) => l.id));
  if (layers.length !== ids.size) return false;

  return true;
});
