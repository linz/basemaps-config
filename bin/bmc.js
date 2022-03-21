#!/usr/bin/env node
if (process.env.AWS_REGION == null) process.env.AWS_REGION = process.env.AWS_DEFAULT_REGION;

import { run, flush, Errors } from '@oclif/core';

run(void 0, import.meta.url)
  .then(flush)
  .catch((error) => {
    if (error.oclif) return Errors.handle(error);
    console.log(error);
  });
