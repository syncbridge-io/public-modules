import net from 'node:net';
import path from 'node:path';
import { createTestEnv } from '@syncbridge/testing';
import { expect } from 'expect';
import { EchoApp } from './_fixtures/echo-ext/src/index.js';

const FIXTURE = path.resolve(import.meta.dirname, '_fixtures/echo-ext');

describe('virtual network', () => {
  const env = createTestEnv({ from: FIXTURE });

  afterEach(() => env.reset());
  after(() => env.dispose());

  it('should stand an ephemeral port in for the one a component listens on', async () => {
    const app = await env.start(EchoApp, {
      components: { listener: { values: { port: 7 } } },
    });
    const address = app.listener.server.address() as net.AddressInfo;
    expect(address.port).not.toBe(7);
    expect(address.address).toBe('127.0.0.1');

    const conn = await env.connect(app, 'listener');
    expect((await conn.request('ping')).toString()).toBe('PING');
  });

  it('should let two apps listen on the same port', async () => {
    const a = await env.start(EchoApp, {
      components: { listener: { values: { port: 17001 } } },
    });
    const b = await env.start(EchoApp, {
      components: { listener: { values: { port: 17001 } } },
    });
    expect(a.status).toBe('started');
    expect(b.status).toBe('started');
  });

  it('should frame messages', async () => {
    const app = await env.start(EchoApp, {
      components: { listener: { values: { port: 2575 } } },
    });
    const conn = await env.connect(app, 'listener', { framing: 'mllp' });
    expect((await conn.request('MSH|^~\\&')).toString()).toBe('MSH|^~\\&');
    const astm = await env.connect(app, 'listener', {
      framing: { start: '\x02', end: '\x03' },
    });
    expect((await astm.request('r1')).toString()).toBe('R1');
  });

  it('should serve what a client component connects to', async () => {
    const device = env.serve({ port: 4001 });
    const app = await env.start(EchoApp, {
      components: {
        listener: { values: { port: 7 } },
        device: { values: { host: 'analyzer.lab', port: 4001 } },
      },
    });
    const conn = await device.connection();
    expect((await conn.receive()).toString()).toBe('hello');
    conn.send('result 42');
    await env.waitForEvent(app.device!, 'data');
    expect(app.fromDevice).toEqual(['result 42']);
    const traffic = env.channelLogs(app, 'device/communication');
    expect(
      traffic.map(r => [r.event, String(r.data ?? r.message), r.source]),
    ).toEqual([
      ['connect', 'Connected', 'device'],
      ['write', 'hello', 'device'],
      ['read', 'result 42', 'device'],
    ]);
    expect(traffic[1].details).toMatch(/^analyzer\.lab:/);
    /* The connection's note tells what it connected to */
    expect(traffic[0].details).toBe('analyzer.lab:4001');
  });

  it('should leave a channel off as its definition does, when asked', async () => {
    const device = env.serve({ port: 4002 });
    const app = await env.start(EchoApp, {
      components: {
        listener: { values: { port: 7 } },
        device: { values: { host: 'analyzer.lab', port: 4002 } },
      },
      logChannels: 'defaults',
    });
    await (await device.connection()).receive();
    /* A component's communication is off unless turned on */
    expect(env.channelLogs(app, 'device/communication')).toEqual([]);
  });

  it('should leave connections outside the apps alone', async () => {
    const server = net.createServer(s => s.end('real'));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as net.AddressInfo;
      const answer = await new Promise<string>((resolve, reject) => {
        const s = net.connect(port, '127.0.0.1');
        s.on('data', d => resolve(d.toString())).on('error', reject);
      });
      expect(answer).toBe('real');
    } finally {
      server.close();
    }
  });
});
