import { DefineVariable } from '@syncbridge/common';

/**
 * The plugin's settings, under `plugins.oracle-client.settings`
 */
export class OracleClientSettings {
  @DefineVariable({
    label: 'Version',
    description:
      "The Instant Client version to install, as Oracle names its download (e.g. 23.9.0.25.07). It is what the status tells, and what Oracle's download address is built from",
    default: '23.9.0.25.07',
    index: 100,
  })
  declare version: string;

  @DefineVariable({
    label: 'SHA-256',
    description:
      'The checksum Oracle publishes beside the download. Given, a download that does not match it is refused',
    index: 101,
  })
  declare sha256?: string;
}
