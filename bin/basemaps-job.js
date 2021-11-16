#!/usr/bin/env node

import { CommandImportImagery } from '../build/src/cli.import.job.js';
import handle from '@oclif/errors/handle.js';

CommandImportImagery.run(void 0, import.meta.url).catch((e) => {
  if (e.oclif) return handle(e);
  console.log(e);
});
