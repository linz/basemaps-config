import { handler as h } from '@basemaps/lambda-tiler';

import { ConfigProviderMemory, Config } from '@basemaps/config';
import { ConfigData } from './config.js';

const mem = ConfigProviderMemory.fromJson(ConfigData);
Config.setConfigProvider(mem);

export function handler(evt: any, context: any, cb: any): void {
  if (evt.requestContext.domainName) {
    process.env['BASEMAPS_PUBLIC_URL'] = 'https://' + evt.requestContext.domainName;
  }

  h(evt, context, cb);
}
