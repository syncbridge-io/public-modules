import { createHash } from 'node:crypto';
import fs, { createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DefineVariable } from '@syncbridge/common';
import { Plugin, PluginBase, type PluginHost } from '@syncbridge/plugin-api';
import { CLIENT_DIR, INSTALL_RECORD } from '../constants.js';
import { downloadUrlOf } from '../utils/download-url.js';
import { hasLibaio, LIBAIO_MISSING } from '../utils/libaio.js';
import { unpackClient } from '../utils/unpack.js';
import { OracleClientSettings } from './oracle-client.variables.js';

/** The form of the "from-file" action */
export class InstallFromFileInput {
  @DefineVariable({
    label: 'Zip',
    description:
      "The Basic package's path on this server, or an address to download it from",
    required: true,
  })
  declare source: string;
}

/** What the plugin keeps beside the client it installed */
interface InstallRecord {
  version: string;
  source: string;
  installedAt: string;
}

/**
 * Installs Oracle Instant Client on the server and gives it to the workers.
 *
 * Oracle 11 answers in Thick mode alone, which needs Instant Client, and
 * Oracle's license does not let SyncBridge carry it in its image or its
 * package - so an admin accepts the license here and the plugin downloads
 * it from Oracle.
 */
@Plugin({
  name: 'oracle-client',
  title: 'Oracle Instant Client',
  description:
    "Downloads Oracle Instant Client, once an admin has accepted Oracle's license, and adds it to every worker's environment",
  settings: OracleClientSettings,
})
export class OracleClientPlugin extends PluginBase<OracleClientSettings> {
  protected _removeActions: (() => void)[] = [];
  protected _removeEnvironment?: () => void;
  /** One install at a time, whichever action asked for it */
  protected _installing?: Promise<InstallRecord>;

  get clientDirectory(): string {
    return path.join(this.dataDirectory, CLIENT_DIR);
  }

  async activate(): Promise<void> {
    this._needsPluginApi21();
    this._registerActions();
    /* The engine waits for activate, and the license is answered by a person:
     * the question and the download are told through the status instead */
    void this._bringUp();
  }

  async deactivate(): Promise<void> {
    /* The engine undoes what was registered; an install still running is
     * left to finish into a directory nothing reads any more */
    this._removeActions.splice(0);
    this._removeEnvironment = undefined;
  }

  /**
   * The engine tells a plugin the plugin-api version it has itself, and
   * refuses a plugin whose peer range it does not satisfy - but an engine
   * built on 2.0 that reaches here anyway has none of what this plugin
   * talks through. Said plainly, on its card, rather than failing at the
   * first call.
   */
  protected _needsPluginApi21(): void {
    /* The types promise all of it; an engine built on 2.0 does not */
    const host = this.host as Partial<PluginHost>;
    if (
      host.status &&
      host.ui &&
      typeof host.workers?.addEnvironment === 'function'
    )
      return;
    throw new Error(
      'This plugin needs a SyncBridge built on @syncbridge/plugin-api 2.1 or newer: ' +
        `this one provides ${host.engine?.apiVersion || 'an older API'}, which has no status, questions or workers' environment. Update SyncBridge.`,
    );
  }

  /** The license, then the client: installed already, or downloaded */
  protected async _bringUp(): Promise<void> {
    try {
      if (!(await this._licenseAccepted())) return;
      const installed = this._installed();
      if (installed) this._give(installed);
      else await this._install();
    } catch (err: any) {
      this.logger?.error(err);
      this.host.status.set({ state: 'error', message: err.message });
    }
  }

  /**
   * Oracle's license, asked once: the engine keeps the answer, so a restart
   * does not ask again. Declined, the plugin does nothing and says so.
   */
  protected async _licenseAccepted(askAgain?: boolean): Promise<boolean> {
    if (askAgain) this.host.ui.forget('license');
    const answer = await this.host.ui.ask({
      id: 'license',
      title: "Oracle's license",
      text:
        'Instant Client is downloaded from Oracle and installed on this server under Oracle Technology Network terms. ' +
        'SyncBridge may not carry it, which is why it is installed here.',
      link: {
        label: "Read Oracle's license",
        url: 'https://www.oracle.com/downloads/licenses/instant-client-lic.html',
      },
      choices: [
        { value: 'accept', label: 'Accept', primary: true },
        { value: 'decline', label: 'Decline' },
      ],
    });
    if (answer.choice === 'accept') return true;
    this.host.status.set({
      state: 'error',
      message: `${answer.by} declined Oracle's license: no client is installed and the workers are given none. "Install now" asks again.`,
    });
    return false;
  }

  /** The client in the data directory, as its record tells it */
  protected _installed(): InstallRecord | undefined {
    const record = path.join(this.dataDirectory, INSTALL_RECORD);
    if (!fs.existsSync(record) || !fs.existsSync(this.clientDirectory))
      return undefined;
    try {
      return JSON.parse(fs.readFileSync(record, 'utf8')) as InstallRecord;
    } catch {
      /* A record nobody can read is no record: install again */
      return undefined;
    }
  }

  /** The client's directory to every worker, and the version on its card */
  protected _give(record: InstallRecord): void {
    if (!this._hasLibaio()) {
      this.host.status.set({ state: 'error', message: LIBAIO_MISSING });
      return;
    }
    this._removeEnvironment?.();
    this._removeEnvironment = this.host.workers.addEnvironment({
      LD_LIBRARY_PATH: [this.clientDirectory],
      TNS_ADMIN: path.join(this.clientDirectory, 'network', 'admin'),
    });
    this.host.status.set({
      state: 'ready',
      message: `Instant Client ${record.version}`,
    });
  }

  /** The host's libaio, which a test plays without one */
  protected _hasLibaio(): boolean {
    return hasLibaio();
  }

  /** Downloads and unpacks, one at a time; `source` for the file action */
  protected _install(source?: string): Promise<InstallRecord> {
    if (this._installing) return this._installing;
    this._installing = this._installNow(source).finally(
      () => (this._installing = undefined),
    );
    return this._installing;
  }

  protected async _installNow(source?: string): Promise<InstallRecord> {
    const { version } = this.settings;
    const zip = path.join(this.dataDirectory, 'download.zip');
    fs.mkdirSync(this.dataDirectory, { recursive: true });
    try {
      if (source && !/^https?:\/\//.test(source)) {
        if (!fs.existsSync(source))
          throw new Error(`There is no file at "${source}" on this server`);
        this.host.status.set({ state: 'busy', message: `Reading ${source}` });
        fs.copyFileSync(source, zip);
      } else {
        const url =
          source ||
          downloadUrlOf(version, process.arch, this.settings.downloadUrl);
        await this._download(url, zip);
      }
      if (this.settings.sha256) this._verify(zip, this.settings.sha256);
      this.host.status.set({ state: 'busy', message: 'Unpacking' });
      unpackClient(zip, this.clientDirectory);
      const record: InstallRecord = {
        version,
        source: source || 'oracle.com',
        installedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(this.dataDirectory, INSTALL_RECORD),
        JSON.stringify(record, null, 2),
      );
      this.logger?.info(
        `Instant Client ${version} installed in ${this.clientDirectory}`,
      );
      this._give(record);
      return record;
    } finally {
      fs.rmSync(zip, { force: true });
    }
  }

  /** The download, its progress on the card while it runs */
  protected async _download(url: string, target: string): Promise<void> {
    this.host.status.set({
      state: 'busy',
      message: 'Downloading',
      progress: 0,
    });
    this.logger?.info(`Downloading Instant Client from ${url}`);
    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error(
        `Downloading ${url} failed: ${response.status} ${response.statusText}`,
      );
    const total = Number(response.headers.get('content-length')) || 0;
    let received = 0;
    const body = Readable.fromWeb(response.body as any);
    body.on('data', (chunk: Buffer) => {
      received += chunk.length;
      this.host.status.set({
        state: 'busy',
        message: 'Downloading',
        ...(total ? { progress: received / total } : undefined),
      });
    });
    await pipeline(body, createWriteStream(target));
  }

  protected _verify(zip: string, expected: string): void {
    const sum = createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
    if (sum.toLowerCase() !== expected.trim().toLowerCase())
      throw new Error(
        `The download does not match the SHA-256 in the settings: ${sum}`,
      );
  }

  protected _registerActions(): void {
    this._removeActions.push(
      this.host.ui.registerAction({
        name: 'install',
        label: 'Install now',
        description:
          "Downloads the client again from the address in the settings. It also asks Oracle's license again when it was declined",
        confirm: 'Download Instant Client and replace what is installed?',
        run: async () => {
          if (!(await this._licenseAccepted(true)))
            return { message: "Oracle's license was declined" };
          const record = await this._install();
          return { message: `Instant Client ${record.version} installed` };
        },
      }),
      this.host.ui.registerAction<InstallFromFileInput>({
        name: 'from-file',
        label: 'Install from file',
        description:
          'For a server that does not reach Oracle: the zip downloaded elsewhere, by its path here or its address',
        input: InstallFromFileInput,
        run: async ({ source }) => {
          if (!(await this._licenseAccepted()))
            return { message: "Oracle's license was declined" };
          const record = await this._install(source);
          return { message: `Instant Client ${record.version} installed` };
        },
      }),
      this.host.ui.registerAction({
        name: 'remove',
        label: 'Remove',
        description:
          'Deletes the client. The workers keep it until they restart',
        confirm:
          'Remove Instant Client? A worker that needs it fails once it restarts.',
        danger: true,
        run: () => {
          this._removeEnvironment?.();
          this._removeEnvironment = undefined;
          fs.rmSync(this.clientDirectory, { recursive: true, force: true });
          fs.rmSync(path.join(this.dataDirectory, INSTALL_RECORD), {
            force: true,
          });
          this.host.status.set({
            state: 'attention',
            message: 'No Instant Client installed',
          });
          return { message: 'Instant Client removed' };
        },
      }),
    );
  }
}
