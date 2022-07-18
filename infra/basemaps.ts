import { handler as h } from '@basemaps/lambda-tiler';
import { ConfigProviderMemory, Config, ConfigBundled } from '@basemaps/config';
import { fsa } from '@chunkd/fs';

export function handler(evt: any, context: any, cb: any): void {
  process.env['BASEMAPS_ASSEST_LOCATION'] = process.env['ASSETS_LOCATION'];
  if (evt.requestContext.domainName) {
    process.env['BASEMAPS_PUBLIC_URL'] = 'https://' + evt.requestContext.domainName;
  }

  const configLocation = process.env['CONFIG_LOCATION'];
  if (configLocation == null) throw new Error('Config File Not Found');
  fsa.readJson<ConfigBundled>(configLocation).then((c) => {
    const mem = ConfigProviderMemory.fromJson(c);
    Config.setConfigProvider(mem);
  });

  h(evt, context, cb);
}
