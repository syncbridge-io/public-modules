import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

/** What every Instant Client package carries: the client library itself */
const CLIENT_LIBRARY = /libclntsh\.(so|dylib)/;

/**
 * Unpacks the Basic package into `target`, replacing what is there. Oracle's
 * zip holds one directory (`instantclient_23_9`); its contents are what
 * `LD_LIBRARY_PATH` points at, so the directory itself is dropped.
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
  if (
    !entries.some(entry => CLIENT_LIBRARY.test(path.basename(entry.entryName)))
  )
    throw new Error(
      'The zip carries no libclntsh: it is not an Instant Client Basic package',
    );
  const staging = `${target}.unpacking`;
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  archive.extractAllTo(staging, true);
  const unpacked = fs.readdirSync(staging, { withFileTypes: true });
  const root =
    unpacked.length === 1 && unpacked[0].isDirectory()
      ? path.join(staging, unpacked[0].name)
      : staging;
  fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(root, target);
  fs.rmSync(staging, { recursive: true, force: true });
}
