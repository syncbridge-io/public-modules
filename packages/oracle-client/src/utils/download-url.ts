/**
 * Oracle's own address for the Basic package of a version, for the
 * architecture the server runs on. Oracle moves these, so the plugin's
 * `downloadUrl` setting overrides it - with "{version}" and "{arch}" in it.
 */
export function downloadUrlOf(
  version: string,
  arch: string,
  template?: string,
): string {
  if (template)
    return template.replaceAll('{version}', version).replaceAll('{arch}', arch);
  if (arch !== 'x64' && arch !== 'arm64')
    throw new Error(
      `Oracle publishes no Instant Client for "${arch}": give the address of one in the plugin's settings`,
    );
  const platform = arch === 'x64' ? 'linux.x64' : 'linux.arm64';
  /* The directory is the version without its dots */
  const directory = version.replaceAll('.', '');
  return `https://download.oracle.com/otn_software/linux/instantclient/${directory}/instantclient-basic-${platform}-${version}dbru.zip`;
}
