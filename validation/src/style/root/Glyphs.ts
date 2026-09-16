import { z } from 'zod';

export const Glyphs = z.string().optional();

// export function check(style: StyleType) {
//     return style.refine((style) => {
//         style.layers.some((layer) => {
//             layer.
//         })
//     })

// }
