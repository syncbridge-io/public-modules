import http from 'node:http';
import AdmZip from 'adm-zip';

/** An Instant Client package as Oracle's: one directory, the client in it */
export function clientZip(version = '23.9.0.25.07'): Buffer {
  const zip = new AdmZip();
  const root = `instantclient_${version.split('.').slice(0, 2).join('_')}`;
  zip.addFile(`${root}/libclntsh.so`, Buffer.from('not really a library'));
  zip.addFile(`${root}/network/admin/README`, Buffer.from('tnsnames here'));
  return zip.toBuffer();
}

export interface ZipServer {
  url(path?: string): string;
  /** What was asked of it, to tell a download that never happened */
  requests: string[];
  close(): Promise<void>;
}

/**
 * Serves the zip at `/client.zip`, garbage at `/garbage.zip` and nothing at
 * anything else - the download's three answers, without reaching Oracle.
 */
export async function zipServer(zip: Buffer): Promise<ZipServer> {
  const requests: string[] = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url || '');
    if (req.url === '/client.zip') {
      res.writeHead(200, {
        'content-type': 'application/zip',
        'content-length': String(zip.length),
      });
      res.end(zip);
      return;
    }
    if (req.url === '/garbage.zip') {
      const body = Buffer.from('<html>Not a zip</html>');
      res.writeHead(200, {
        'content-type': 'application/zip',
        'content-length': String(body.length),
      });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  });
  await new Promise<void>(resolve =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const { port } = server.address() as { port: number };
  return {
    url: (path = '/client.zip') => `http://127.0.0.1:${port}${path}`,
    requests,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}
