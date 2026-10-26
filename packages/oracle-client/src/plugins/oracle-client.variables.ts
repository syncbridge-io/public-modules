import { DefineVariable } from '@syncbridge/common';

/**
 * The plugin's settings, under `plugins.oracle-client.settings`
 */
export class OracleClientSettings {
  @DefineVariable({
    label: 'Version',
    description:
      'The Instant Client version to install, as Oracle names its download (e.g. 23.9.0.25.07). It is what the status tells, and what the default address is built from',
    default: '23.9.0.25.07',
    index: 100,
  })
  declare version: string;

  @DefineVariable({
    label: 'Download address',
    description:
      'Where the Basic package is downloaded from. Left empty, the address is built from the version and the server\'s architecture; "{version}" and "{arch}" ("x64" or "arm64") are replaced in one that is given. Oracle moves these addresses, so a server that fails to download takes the current one here',
    index: 101,
  })
  declare downloadUrl?: string;

  @DefineVariable({
    label: 'SHA-256',
    description:
      'The checksum Oracle publishes beside the download. Given, a download that does not match it is refused',
    index: 102,
  })
  declare sha256?: string;
}
