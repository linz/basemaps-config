import { handler as h } from '@basemaps/lambda-tiler';
import { ConfigProviderMemory, Config, ConfigBundled } from '@basemaps/config';
import { fsa } from '@chunkd/fs';

process.env['BASEMAPS_ASSEST_LOCATION'] = process.env['ASSETS_LOCATION'];

(async (): Promise<void> => {
  const configLocation = process.env['CONFIG_LOCATION'];
  if (configLocation == null) throw new Error('Config File Not Found');
  const configJson = await fsa.readJson<ConfigBundled>(configLocation);
  const mem = ConfigProviderMemory.fromJson(configJson);
  Config.setConfigProvider(mem);
})();

export function handler(evt: any, context: any, cb: any): void {
  if (evt.requestContext.domainName) {
    process.env['BASEMAPS_PUBLIC_URL'] = 'https://' + evt.requestContext.domainName;
  }

  h(evt, context, cb);
}
