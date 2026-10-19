import net from 'node:net';
import { expect } from 'expect';
import { TcpReconnectManager } from '../src/classes/tcp-reconnect-manager.js';

describe('TcpReconnectManager', () => {
  it('should tell the error that dropped a connection, not a flag', async () => {
    const server = net.createServer(socket => socket.resetAndDestroy());
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;
    const manager = new TcpReconnectManager(
      args =>
        new Promise<net.Socket>((resolve, reject) => {
          const socket = net.connect(args.port!, args.host);
          socket.once('connect', () => resolve(socket));
          socket.once('error', reject);
        }),
      { strategy: 'fibonacci' },
    );
    manager.on('error', () => undefined);
    try {
      const error = await new Promise<unknown>(resolve => {
        manager.once('disconnect', resolve);
        manager.connect({ host: '127.0.0.1', port });
      });
      expect(error).toBeInstanceOf(Error);
    } finally {
      manager.disconnect();
      server.close();
    }
  });
});
