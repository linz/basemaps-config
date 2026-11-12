import { readdirSync, readFileSync, Stats, statSync, writeFileSync } from 'fs';
import path from 'path';

import { Fonts } from './providers/Fonts.js';
import { Sprites } from './providers/Sprites.js';
import { Root } from './style/Root.js';

interface Props {
  filepath: string;
  name: string;
  ext: string;
  stat: Stats;
}

function readFilesSync(dir: string): Props[] {
  const files: Props[] = [];

  readdirSync(dir).forEach((filename) => {
    const name = path.parse(filename).name;
    const ext = path.parse(filename).ext;
    const filepath = path.resolve(dir, filename);
    const stat = statSync(filepath);
    const isFile = stat.isFile();

    if (isFile) files.push({ filepath, name, ext, stat });
  });

  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return files;
}

function readContentsSync(files: Props[]): string[] {
  const contents: string[] = [];

  files.forEach(({ filepath }) => contents.push(readFileSync(filepath, { encoding: 'utf-8' })));

  return contents;
}

export async function validate(): Promise<void> {
  const files = readFilesSync('../config/style');

  const contents = readContentsSync(files);

  const jsons = contents.map((c) => JSON.parse(c) as unknown);

  try {
    await Fonts.init();
    await Sprites.init();
  } catch (e) {
    return;
  }

  const parses = jsons.map((json) => Root.safeParse(json));

  if (parses.every((p) => p.success)) {
    return console.log('no errors');
  }

  const errors = {
    results: [
      ...files.map((f, i) => ({
        style: f.name,
        errors: parses[i]?.error,
      })),
    ],
  };

  writeFileSync('errors.json', JSON.stringify(errors), 'utf-8');
  console.log('issues written to errors.json');
}

void validate();
