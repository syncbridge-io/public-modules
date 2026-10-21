import net from 'node:net';
import { expect } from 'expect';
import { TcpClientComponent } from '../src/index.js';

describe('TcpClientComponent', () => {
  let server: net.Server;
  let sockets: net.Socket[];
  let client: TcpClientComponent;

  beforeEach(async () => {
    sockets = [];
    server = net.createServer(socket => sockets.push(socket));
    await new Promise<void>(resolve =>
      server.listen(0, '127.0.0.1', () => resolve()),
    );
    client = new TcpClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'tcp',
      path: 'tcp',
      values: {
        host: '127.0.0.1',
        port: (server.address() as net.AddressInfo).port,
        /* Long enough that a lost connection stays lost during the test */
        reconnect: { initialDelay: 30000, maxDelay: 60000 },
      },
    });
    await client.init();
  });

  afterEach(async () => {
    await client.stop();
    await new Promise(resolve => server.close(resolve));
  });

  it('should tell the error that dropped its connection, and be unhealthy', async () => {
    const dropped = new Promise<Error | undefined>(resolve =>
      client.once('disconnect', error => resolve(error)),
    );
    await client.start();
    /* Reset once connected: a reset that comes first is a failed connect on
     * Linux, not a lost connection */
    while (!sockets.length || !client.connected)
      await new Promise(resolve => setTimeout(resolve, 10));
    sockets[0].resetAndDestroy();
    const error = await dropped;
    expect(error).toBeInstanceOf(Error);
    expect(client.status).toBe('unhealthy');
  });
});
