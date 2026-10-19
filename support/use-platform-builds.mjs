#!/usr/bin/env node
/*
 * Installs the SyncBridge platform's packages from the platform
 * repository's builds, in place of npm's: while the modules need what the
 * platform has not released yet. Each build is packed and installed as a
 * tarball - copied, not linked - so this repository has one
 * @syncbridge/common, as SyncBridge has. package.json and the lockfile are
 * left as they are; `npm install` brings npm's versions back.
 *
 *   node support/use-platform-builds.mjs
 *
 * The platform repository: SB_PLATFORM_DIR, else ../syncbridge.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLATFORM = path.resolve(
  ROOT,
  process.env.SB_PLATFORM_DIR || '../syncbridge',
);
/* In the order they depend on each other */
const PACKAGES = ['common', 'runtime', 'testing', 'syncbuild'];
const OUT = path.join(ROOT, '.platform');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
const tarballs = [];
for (const name of PACKAGES) {
  const build = path.join(PLATFORM, 'packages/public', name, 'build');
  const manifest = path.join(build, 'package.json');
  if (!fs.existsSync(manifest)) {
    console.error(
      `No build of @syncbridge/${name} in ${build}: ask the platform's session to build it.`,
    );
    process.exit(1);
  }
  const { version } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const built = fs.statSync(path.join(build, 'index.js')).mtime;
  console.log(`@syncbridge/${name} ${version}, built ${built.toISOString()}`);
  const file = execFileSync(
    'npm',
    ['pack', build, '--pack-destination', OUT, '--silent'],
    { encoding: 'utf8' },
  ).trim();
  tarballs.push(path.join(OUT, file));
}
execFileSync('npm', ['install', '--no-save', ...tarballs], {
  cwd: ROOT,
  stdio: 'inherit',
});
console.log('The platform packages are installed from its builds.');
