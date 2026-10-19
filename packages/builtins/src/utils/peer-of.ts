/**
 * The other side of a connection as a log record's `details`: a socket
 * address (`{ address, port }`) as `address:port`, a string as it is
 */
export function peerOf(info: unknown): string | undefined {
  if (info == null) return;
  if (typeof info === 'string') return info || undefined;
  const { address, port } = info as { address?: string; port?: number };
  if (address) return port == null ? address : `${address}:${port}`;
}
