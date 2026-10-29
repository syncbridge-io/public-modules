import net from 'node:net';
import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { HL7Message } from 'hl7v2';
import { HL7Server, type HL7Socket } from 'hl7v2-net';
import { HL7ClientComponent } from '../src/index.js';
import { Socks5Server } from './_fixtures/socks5-server.js';

const ORU =
  'MSH|^~\\&|MONITOR|ICU|SB|HOSP|20261011120000||ORU^R01|MSG0001|P|2.5\r' +
  'PID|1||12345^^^HOSP^MR||DOE^JOHN\r' +
  'OBR|1|||8867-4^Heart rate^LN\r' +
  'OBX|1|NM|8867-4^Heart rate^LN||72|/min|||||F';

/** Resolves when `component` reaches `status` */
function statusOf(component: HL7ClientComponent, status: string) {
  return new Promise<void>((resolve, reject) => {
    if (component.status === status) return resolve();
    const timer = setTimeout(
      () => reject(new Error(`Still ${component.status}, not ${status}`)),
      5000,
    );
    component.on('status-change', (s: string) => {
      if (s !== status) return;
      clearTimeout(timer);
      resolve();
    });
  });
}

describe('HL7ClientComponent', () => {
  let server: net.Server;
  let sockets: net.Socket[];
  let client: HL7ClientComponent;

  beforeEach(async () => {
    sockets = [];
    server = net.createServer(socket => sockets.push(socket));
    await new Promise<void>(resolve =>
      server.listen(0, '127.0.0.1', () => resolve()),
    );
    client = new HL7ClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Client',
      path: 'hl7Client',
      values: {
        host: '127.0.0.1',
        port: (server.address() as net.AddressInfo).port,
        /* Long enough that a lost connection stays lost during the test */
        reconnect: { initialDelay: 30000, maxDelay: 60000 },
      },
    });
  });

  afterEach(async () => {
    await client.stop();
    sockets.forEach(s => s.destroy());
    await new Promise(resolve => server.close(resolve));
  });

  it('should be started once connected, not left unhealthy', async () => {
    await client.start();
    await statusOf(client, 'started');
    expect(client.client.connected).toBe(true);
  });

  it('should be unhealthy when the connection is lost', async () => {
    await client.start();
    await statusOf(client, 'started');
    /* The server may accept the connection a moment after the client sees it */
    while (!sockets.length) await new Promise(r => setTimeout(r, 10));
    sockets.forEach(s => s.destroy());
    await statusOf(client, 'unhealthy');
    expect(client.statusMessage).toMatch(/connection lost|Disconnected/);
  });
});

describe('HL7ClientComponent handlers', () => {
  let server: HL7Server;
  let client: HL7ClientComponent;
  const sockets: HL7Socket[] = [];

  /** The connection the client made after `known` ones: an older one may be closing */
  async function openSocket(known: number): Promise<HL7Socket> {
    for (let i = 0; i < 100; i++) {
      const socket = sockets.length > known && sockets.at(-1);
      if (socket && socket.connected) return socket;
      await new Promise(r => setTimeout(r, 20));
    }
    throw new Error('The client did not connect again');
  }

  beforeEach(async () => {
    sockets.length = 0;
    server = HL7Server.createServer();
    server.on('connection', socket => sockets.push(socket));
    await server.listen(0, '127.0.0.1');
    client = new HL7ClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Client',
      path: 'hl7Client',
      values: {
        host: '127.0.0.1',
        port: (server.address() as net.AddressInfo).port,
        reconnect: { initialDelay: 50, maxDelay: 200 },
      },
    });
    await client.init();
  });

  afterEach(async () => {
    await client.stop();
    await server.close();
  });

  it('should write what it sends and receives to its communication channel', async () => {
    const records: LogChannel.Record[] = [];
    Object.defineProperty(client, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    server.use((req, res) => {
      res.message = req.message.createAck();
    });
    await client.start();
    await statusOf(client, 'started');
    await client.client.sendMessageWaitAck(HL7Message.parse(ORU));

    const sent = records.find(r => r.direction === 'out');
    const received = records.find(r => r.direction === 'in');
    expect(String(sent?.data)).toContain('MSG0001');
    expect(String(received?.data)).toContain('MSA|AA|MSG0001');
  });

  it('should keep its handlers when its values change', async () => {
    const received: string[] = [];
    client.use((req, res) => {
      received.push(req.message.get('MSH-10') as string);
      res.message = req.message.createAck();
    });
    await client.start();
    await statusOf(client, 'started');
    /* The server may accept the connection a moment after the client sees
     * it; counted before that, the old connection would pass for the new one */
    while (!sockets.length) await new Promise(r => setTimeout(r, 10));

    const before = client.client;
    const known = sockets.length;
    const restarted = new Promise<void>(resolve =>
      client.on('status-change', (status: string) => {
        if (status === 'started') resolve();
      }),
    );
    client.values.responseTimeout = 20000;
    await client.emitAsync('values-updated', ['responseTimeout']);
    expect(client.client).not.toBe(before);

    /* The server sends to the connection the new client made */
    await restarted;
    const socket = await openSocket(known);
    const ack = await socket.sendMessageWaitAck(
      HL7Message.parse(
        'MSH|^~\\&|HIS|HOSP|SB|HOSP|20261011120000||ADT^A01|ADT0001|P|2.5\r' +
          'PID|1||12345^^^HOSP^MR||DOE^JOHN',
      ),
    );
    expect(received).toEqual(['ADT0001']);
    expect(ack.get('MSA-1')).toBe('AA');
  });
});

describe('HL7ClientComponent through a SOCKS proxy', () => {
  let server: HL7Server;
  let proxy: Socks5Server;
  let client: HL7ClientComponent;

  function create(proxyValues: Record<string, any>) {
    client = new HL7ClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Client',
      path: 'hl7Client',
      values: {
        host: '127.0.0.1',
        port: (server.address() as net.AddressInfo).port,
        reconnect: { initialDelay: 30000, maxDelay: 60000 },
        proxy_enabled: true,
        proxy: {
          host: '127.0.0.1',
          port: proxy.port,
          proxyType: 'v5',
          ...proxyValues,
        },
      },
    });
    return client;
  }

  beforeEach(async () => {
    server = HL7Server.createServer();
    server.use((req, res) => {
      res.message = req.message.createAck();
    });
    await server.listen(0, '127.0.0.1');
    proxy = await new Socks5Server({
      username: 'hl7',
      password: 'secret',
    }).listen();
  });

  afterEach(async () => {
    await client?.stop();
    await proxy.close();
    await server.close();
  });

  it('should reach the server through the proxy, logging in to it', async () => {
    await create({ username: 'hl7', password: 'secret' }).init();
    await client.start();
    await statusOf(client, 'started');
    const ack = await client.client.sendMessageWaitAck(HL7Message.parse(ORU));
    expect(ack.get('MSA-1')).toBe('AA');
    expect(proxy.logins).toEqual([{ username: 'hl7', password: 'secret' }]);
    expect(proxy.tunnels).toEqual([
      `127.0.0.1:${(server.address() as net.AddressInfo).port}`,
    ]);
  });

  it('should not connect when the proxy refuses its login', async () => {
    await create({ username: 'hl7', password: 'wrong' }).init();
    await client.start();
    await new Promise(r => setTimeout(r, 200));
    expect(client.client.connected).toBe(false);
    expect(client.status).toBe('unhealthy');
    expect(proxy.tunnels).toEqual([]);
  });

  it('should connect directly when the proxy is not enabled', async () => {
    await create({ username: 'hl7', password: 'secret' }).init();
    client.values.proxy_enabled = false;
    await client.start();
    await statusOf(client, 'started');
    expect(proxy.logins).toEqual([]);
  });
});
