/**
 * Some hex color values in styles such as #ff00ff0f are valid
 * in maplibre but not valid in mapbox which causes errors
 * if the style needs to be rendered in mapbox
 */
import { ChildProcess, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GrayScaleSheets = new Map([['topolite-v2', 'topolite-gray-v2']]);
type Rgba = { r: number; g: number; b: number; alpha: number };
type Hsla = { h: number; s: number; l: number; alpha: number };

function rgbaToHsla(color: Rgba): Hsla {
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
  const targetName = GrayScaleSheets.get(file.name.replace('.json', ''));
  if (targetName == null) continue;

  const style = fs.readFileSync(path.join(file.parentPath, file.name), 'utf-8');

  let hasChanges = false;
  const outputStyle = style.replace(/rgba\([\s\d,\.]+\)/g, (match) => {
    const [r, g, b, alpha] = match
      .slice(5, -1)
      .split(',')
      .map((s) => Number(s.trim()));
    if (r == null || g == null || b == null || alpha == null) return match;
    if (r === g && r === b) return match; // already grayscale
    if (r > 250 && g > 250 && b > 250) return match; // near white
    // console.log(r, g, b, alpha);
    const hsla = rgbaToHsla({ r, g, b, alpha });
    // Grayscale hsla saturation is 0
    // which makes r=g=b = l * 255;
    hsla.s = 0;
    const color = Math.round(hsla.l * 255);
    const rgba = `rgba(${color}, ${color}, ${color}, ${alpha})`;
    if (rgba === match) return match;
    console.log('\t', match, '=>', rgba);
    hasChanges = true;
    return rgba;
  });

  if (hasChanges) {
    const style = JSON.parse(outputStyle) as { id: string; name: string };
    style.id = 'st_' + targetName;
    style.name = targetName;
    const target = path.join(file.parentPath, targetName + '.json');

    console.log('Done converting grayscale', targetName);
    fs.writeFileSync(target, JSON.stringify(style, null, 2), 'utf-8');
    // Force a prettier format, easier than importing prettier api
    execSync(`npx prettier --write "${target}"`);
  }
}
