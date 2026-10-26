import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/* Where a distribution puts it; the architecture's directory included */
const DIRECTORIES = [
  '/lib',
  '/lib64',
  '/usr/lib',
  '/usr/lib64',
  '/usr/lib/x86_64-linux-gnu',
  '/usr/lib/aarch64-linux-gnu',
];
const NAMES = ['libaio.so.1', 'libaio.so.1t64', 'libaio.so'];

/**
 * Whether the host has libaio, which Instant Client links against. It is the
 * host's to provide - the Docker image carries it, the Linux package depends
 * on it - so the plugin only tells the admin when it is not there.
 */
export function hasLibaio(): boolean {
  /* Only Linux links against it; elsewhere the client is not ours to judge */
  if (process.platform !== 'linux') return true;
  for (const dir of DIRECTORIES)
    for (const name of NAMES)
      if (fs.existsSync(path.join(dir, name))) return true;
  /* A distribution that keeps it elsewhere: ask the linker's own cache */
  try {
    const out = execFileSync('ldconfig', ['-p'], { encoding: 'utf8' });
    return /\blibaio\.so/.test(out);
  } catch {
    return false;
  }
}

export const LIBAIO_MISSING =
  'libaio is not installed on this server, and Instant Client cannot load without it. ' +
  'It belongs to the server, not to this plugin: install libaio1 (Debian, Ubuntu) or libaio (RHEL, Alma, Rocky), or run SyncBridge from its Docker image, which carries it.';
