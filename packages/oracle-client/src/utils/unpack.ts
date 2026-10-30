import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

/** What every Instant Client package carries: the client library itself */
const CLIENT_LIBRARY = /libclntsh\.(so|dylib)/;

/* The file type in the Unix mode a zip keeps in its external attributes */
const S_IFMT = 0o170000;
const S_IFLNK = 0o120000;

/**
 * Unpacks the Basic package into `target`, replacing what is there. Oracle's
 * zip holds the client in a directory (`instantclient_19_32`), beside its
 * signature in `META-INF/` for 19; the directory holding libclntsh is what
 * `LD_LIBRARY_PATH` points at, so it becomes `target` and the rest is
 * dropped. What is unpacked is readable by everyone: the workers run as
 * users of their own.
 *
 * Throws when the zip is not an Instant Client package - a download that
 * answered with an error page reaches here as a broken zip.
 */
export function unpackClient(zip: string, target: string): void {
  let archive: AdmZip;
  try {
    archive = new AdmZip(zip);
  } catch (err: any) {
    throw new Error(`The download is not a zip file: ${err.message}`, {
      cause: err,
    });
  }
  const entries = archive.getEntries();
  const library = entries.find(entry =>
    CLIENT_LIBRARY.test(path.basename(entry.entryName)),
  );
  if (!library)
    throw new Error(
      'The zip carries no libclntsh: it is not an Instant Client Basic package',
    );
  const staging = path.resolve(`${target}.unpacking`);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  fs.chmodSync(staging, 0o755);
  extract(entries, staging);
  const root = path.dirname(inside(staging, library.entryName));
  fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(root, target);
  fs.rmSync(staging, { recursive: true, force: true });
}

/**
 * Writes the entries under `directory` one by one. The engine runs a plugin
 * under Node's permission model, readable and writable in its data directory
 * alone: adm-zip's `extractAllTo` stats every directory from the root down,
 * which throws there, and Node refuses a symlink to a plugin altogether. So
 * the directories are made with `mkdirSync`, which asks for the path itself
 * only, and a symlink (`libclntsh.so` -> `libclntsh.so.19.1`) becomes a hard
 * link to its target, the same file to the loader.
 */
function extract(entries: AdmZip.IZipEntry[], directory: string): void {
  const links: { file: string; target: string }[] = [];
  for (const entry of entries) {
    const file = inside(directory, entry.entryName);
    if (entry.isDirectory) {
      makeDirectory(directory, file);
      continue;
    }
    makeDirectory(directory, path.dirname(file));
    const mode = entry.header.attr >>> 16;
    if ((mode & S_IFMT) === S_IFLNK) {
      const target = entry.getData().toString('utf8');
      links.push({ file, target: inside(directory, target, file) });
      continue;
    }
    fs.writeFileSync(file, entry.getData());
    /* Set after writing: the mode written with is narrowed by the umask */
    fs.chmodSync(file, readableByAll(mode & 0o777));
  }
  /* A link may name one that comes after it, or another link: each round
   * links what has its target written, until none is left */
  while (links.length) {
    const ready = links.filter(link => fs.existsSync(link.target));
    if (!ready.length)
      throw new Error(
        `The zip links ${path.relative(directory, links[0].file)} to a file it does not carry`,
      );
    for (const link of ready) {
      fs.linkSync(link.target, link.file);
      links.splice(links.indexOf(link), 1);
    }
  }
}

/** A directory and those above it up to `directory`, each readable by all */
function makeDirectory(directory: string, dir: string): void {
  if (fs.existsSync(dir)) return;
  makeDirectory(directory, path.dirname(dir));
  fs.mkdirSync(dir);
  fs.chmodSync(dir, 0o755);
}

/**
 * The zip's mode, readable by all and runnable by all when it is by its
 * owner; a zip made elsewhere than Unix keeps none, and is given 0644
 */
function readableByAll(mode: number): number {
  if (!mode) return 0o644;
  return mode & 0o100 ? mode | 0o555 : mode | 0o444;
}

/**
 * The path of an entry, or of a link's target relative to the link, refused
 * when it leaves the directory: a crafted zip does not write elsewhere
 */
function inside(directory: string, name: string, from?: string): string {
  const resolved = from
    ? path.resolve(path.dirname(from), name)
    : path.resolve(directory, name);
  if (!resolved.startsWith(directory + path.sep))
    throw new Error(`The zip names a path outside its directory: ${name}`);
  return resolved;
}
