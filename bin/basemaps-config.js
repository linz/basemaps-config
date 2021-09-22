#!/usr/bin/env node

import { CommandImport } from '../build/src/cli.import.config.js';
import handle from '@oclif/errors/handle.js';

CommandImport.run(void 0, import.meta.url).catch((e) => {
  if (e.oclif) return handle(e);
  console.log(e);
});
