/**
 * Oracle's own address for the Basic package of a version, for the
 * architecture the server runs on. Oracle moves these between releases, so
 * the plugin's `downloadUrl` setting overrides it - with "{version}" and
 * "{arch}" in it.
 *
 * Two things about the address are Oracle's own and were measured against
 * download.oracle.com rather than guessed: the directory is the first two
 * parts of the version padded with zeroes to seven digits (23.9.0.25.07 ->
 * 2390000, 21.13.0.0.0 -> 2113000), and the file carries the "dbru" suffix
 * up to 21 but not from 23 on.
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
  const [major, minor = '0'] = version.split('.');
  if (!/^\d+$/.test(major))
    throw new Error(
      `"${version}" is not an Instant Client version: give the address in the plugin's settings`,
    );
  const directory = `${major}${minor}`.padEnd(7, '0');
  const suffix = Number(major) >= 23 ? '' : 'dbru';
  return `https://download.oracle.com/otn_software/linux/instantclient/${directory}/instantclient-basic-linux.${arch}-${version}${suffix}.zip`;
}
