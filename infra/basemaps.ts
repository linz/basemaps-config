import { handler as h } from '@basemaps/lambda-tiler';
import { ConfigProviderMemory, Config, ConfigBundled } from '@basemaps/config';
import fs from 'fs';

const data = fs.readFileSync('../config.json');
const json = JSON.parse(data.toString());
const mem = ConfigProviderMemory.fromJson(json as ConfigBundled);
Config.setConfigProvider(mem);

export function handler(evt: any, context: any, cb: any): void {
  if (evt.requestContext.domainName) {
    process.env['BASEMAPS_PUBLIC_URL'] = 'https://' + evt.requestContext.domainName;
  }

  h(evt, context, cb);
}
