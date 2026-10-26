#!/usr/bin/env node
/*
 * Installs the SyncBridge SDK's packages from the SDK repository's builds
 * (syncbridge-io/node-sdk), in place of the registry's: while the modules need
 * what the SDK has not released yet. Each build is packed and unpacked over
 * the copy pnpm materialized in its virtual store, so every link into it - the
 * root's, each module's - sees the build, and the package keeps the
 * dependencies pnpm installed beside it. package.json and the lockfile are
 * left as they are; `pnpm install --force` brings the registry's versions
 * back.
 *
 *   node support/use-platform-builds.mjs
 *
 * The SDK repository: SB_PLATFORM_DIR, else ../node-sdk.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLATFORM = path.resolve(
  ROOT,
  process.env.SB_PLATFORM_DIR || '../node-sdk',
);
/* In the order they depend on each other */
const PACKAGES = ['common', 'runtime', 'testing', 'syncbuild'];
const OUT = path.join(ROOT, '.platform');
const VIRTUAL_STORE = path.join(ROOT, 'node_modules', '.pnpm');

/**
 * Where pnpm put `@syncbridge/<name>`: one directory per version and peer
 * resolution it installed, all of them replaced - a module reaching the
 * package through a different slot than the root's would otherwise keep the
 * registry's copy.
 */
function slotsOf(name) {
  const prefix = `@syncbridge+${name}@`;
  return fs
    .readdirSync(VIRTUAL_STORE)
    .filter(entry => entry.startsWith(prefix))
    .map(entry =>
      path.join(VIRTUAL_STORE, entry, 'node_modules', '@syncbridge', name),
    )
    .filter(dir => fs.existsSync(dir));
}

if (!fs.existsSync(VIRTUAL_STORE)) {
  console.error(`No ${VIRTUAL_STORE}: run pnpm install first.`);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const name of PACKAGES) {
  const build = path.join(PLATFORM, 'packages', name, 'build');
  const manifest = path.join(build, 'package.json');
  if (!fs.existsSync(manifest)) {
    console.error(
      `No build of @syncbridge/${name} in ${build}: ask the platform's session to build it (npx rman build there).`,
    );
    process.exit(1);
  }
  const slots = slotsOf(name);
  if (!slots.length) {
    console.error(
      `@syncbridge/${name} is not installed: run pnpm install, then this again.`,
    );
    process.exit(1);
  }
  const { version } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const built = fs.statSync(path.join(build, 'index.js')).mtime;
  console.log(`@syncbridge/${name} ${version}, built ${built.toISOString()}`);
  const packed = execFileSync(
    'pnpm',
    ['pack', '--dir', build, '--pack-destination', OUT],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .at(-1)
    .trim();
  const tarball = path.resolve(OUT, packed);
  for (const dir of slots) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('tar', ['-xzf', tarball, '-C', dir, '--strip-components=1']);
  }
}
console.log('The SDK packages are installed from its builds.');
