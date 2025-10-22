/**
 * Some hex color values in styles such as #ff00ff0f are valid
 * in maplibre but not valid in mapbox which causes errors
 * if the style needs to be rendered in mapbox
 */
import fs from 'node:fs';
import path from 'node:path';

const grayScaleSheets = new Set(['topolite-v2']);
type Rgba = { r: number; g: number; b: number; alpha: number };
type Hsla = { h: number; s: number; l: number; alpha: number };

function rgbaToHsla(color: Partial<Rgba>): Hsla {
  console.log(color);
  if (color.r == null || color.g == null || color.b == null || color.alpha == null) throw new Error('Invalid RGBa color');
  const r = (color.r % 255) / 255;
  const g = (color.g % 255) / 255;
  const b = (color.b % 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l, alpha: color.alpha };
}

for (const file of fs.readdirSync('./config/style/', { withFileTypes: true })) {
  if (!file.name.endsWith('.json')) continue;
  if (!grayScaleSheets.has(file.name.replace('.json', ''))) continue;
  const targetName = file.name.replace('.json', '-grayscale.json');

  const style = fs.readFileSync(path.join(file.parentPath, file.name), 'utf-8');

  let hasChanges = false;
  const outputStyle = style.replace(/rgba\([\s\d,\.]+\)/g, (match) => {
    const [r, g, b, alpha] = match
      .slice(5, -1)
      .split(',')
      .map((s) => Number(s.trim()));
    if (r === g && r === b) return match; // already grayscale
    console.log(r, g, b, alpha);
    const hsla = rgbaToHsla({ r, g, b, alpha });
    // Grayscale hsla saturation is 0
    // which makes r=g=b = l * 255;
    hsla.s = 0;
    const color = Math.round(hsla.l * 255);
    const rgba = `rgba(${color}, ${color}, ${color}, ${alpha})`;
    if (rgba === match) return match;
    hasChanges = true;
    return rgba;
  });

  if (hasChanges) {
    const target = path.join(file.parentPath, targetName);

    console.log('Converting grayscale', targetName);
    fs.writeFileSync(target, outputStyle);
  }
}
