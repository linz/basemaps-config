import { handler as h } from '@basemaps/lambda-tiler';
import { ConfigProviderMemory, Config, ConfigBundled } from '@basemaps/config';
import { fsa } from '@chunkd/fs';

const configLocation = process.env['CONFIG_LOCATION'];
process.env['BASEMAPS_ASSEST_LOCATION'] = process.env['ASSETS_LOCATION'];

export async function handler(evt: any, context: any, cb: any): Promise<void> {
  if (configLocation == null) throw new Error('Config File Not Found');
  const configJson = await fsa.readJson<ConfigBundled>(configLocation);
  const mem = ConfigProviderMemory.fromJson(configJson);
  Config.setConfigProvider(mem);

  if (evt.requestContext.domainName) {
    process.env['BASEMAPS_PUBLIC_URL'] = 'https://' + evt.requestContext.domainName;
    process.env['BASEMAPS_ASSEST_LOCATION'] = './assets';
  }

  h(evt, context, cb);
}
