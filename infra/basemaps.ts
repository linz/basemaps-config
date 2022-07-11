import { handler as h } from '@basemaps/lambda-tiler';
import { ConfigProviderMemory, Config, ConfigBundled } from '@basemaps/config';
import { fsa } from '@chunkd/fs';

const configJson = await fsa.readJson<ConfigBundled>('../config.json');
const mem = ConfigProviderMemory.fromJson(configJson);
Config.setConfigProvider(mem);

export function handler(evt: any, context: any, cb: any): void {
  if (evt.requestContext.domainName) {
    process.env['BASEMAPS_PUBLIC_URL'] = 'https://' + evt.requestContext.domainName;
  }

  h(evt, context, cb);
}
