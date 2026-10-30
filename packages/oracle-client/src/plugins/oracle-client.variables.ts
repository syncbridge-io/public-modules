import { DefineVariable } from '@syncbridge/common';

/**
 * The versions Oracle serves for both x64 and arm64, newest first, checked
 * against its download pages. 19 is the last to reach Oracle Database 11.2,
 * which is why it is the default; 23 reaches 19 and later. A release of the
 * plugin brings Oracle's newer ones.
 */
export const INSTANT_CLIENT_VERSIONS = [
  '23.26.4.0.0',
  '23.9.0.25.07',
  '19.32.0.0.0',
];

export const DEFAULT_INSTANT_CLIENT_VERSION = '19.32.0.0.0';

/**
 * The plugin's settings, under `plugins.oracle-client.settings`
 */
export class OracleClientSettings {
  @DefineVariable({
    label: 'Version',
    description:
      'The Instant Client version to install. 19 reaches Oracle Database 11.2 and later, 23 reaches 19 and later. Changed, the new version replaces the installed one at the next start',
    enumValues: INSTANT_CLIENT_VERSIONS,
    default: DEFAULT_INSTANT_CLIENT_VERSION,
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
