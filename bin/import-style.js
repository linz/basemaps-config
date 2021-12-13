#!/usr/bin/env node

import { CommandImportStyle } from '../build/src/cli.import.style.js';
import handle from '@oclif/errors/handle.js';

CommandImportStyle.run(void 0, import.meta.url).catch((e) => {
  if (e.oclif) return handle(e);
  console.log(e);
});
