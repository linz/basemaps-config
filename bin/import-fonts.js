#!/usr/bin/env node

import { CommandImportFonts } from '../build/src/cli.import.fonts.js';
import handle from '@oclif/errors/handle.js';

CommandImportFonts.run(void 0, import.meta.url).catch((e) => {
  if (e.oclif) return handle(e);
  console.log(e);
});
