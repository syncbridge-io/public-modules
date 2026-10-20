import net from 'node:net';
import { expect } from 'expect';
import { TcpClientComponent } from '../src/index.js';

describe('TcpClientComponent', () => {
  let server: net.Server;
  let client: TcpClientComponent;

  beforeEach(async () => {
    server = net.createServer(socket => socket.resetAndDestroy());
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
    const error = await dropped;
    expect(error).toBeInstanceOf(Error);
    expect(client.status).toBe('unhealthy');
  });
});
