/**
 * Some hex color values in styles such as #ff00ff0f are valid
 * in maplibre but not valid in mapbox which causes errors
 * if the style needs to be rendered in mapbox
 */
import fs from 'node:fs';
import path from 'node:path';

function fixHexColor(color: unknown): unknown {
  if (color == null) return null;
  if (typeof color !== 'string') return color;
  if (!color.startsWith('#')) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const alpha = parseInt(color.slice(7, 9) ?? '0xff', 16) / 255;

  if (alpha) {
    return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toPrecision(2))} )`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
}

for (const file of fs.readdirSync('./config/style/', { withFileTypes: true })) {
  if (!file.name.endsWith('.json')) continue;
  const target = path.join(file.parentPath, file.name);
  const style = fs.readFileSync(target, 'utf-8');

  let hasChanges = false;
  const outputStyle = style.replace(/#[0-9a-fA-F]{8}/g, (match) => {
    hasChanges = true;
    return fixHexColor(match);
  });

  if (hasChanges) {
    console.log('Fixing hex colors in', file.name);
    fs.writeFileSync(target, outputStyle);
  }
}
