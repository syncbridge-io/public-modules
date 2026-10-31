import path from 'node:path';
import { createTestEnv } from '@syncbridge/testing';
import { expect } from 'expect';
import { EchoApp } from './_fixtures/echo-ext/src/index.js';

const FIXTURE = path.resolve(import.meta.dirname, '_fixtures/echo-ext');

describe('IO dashboards', () => {
  const env = createTestEnv({ from: FIXTURE });

  afterEach(() => env.reset());
  after(() => env.dispose());

  it("should show a client's link and the bytes it moved", async () => {
    const device = env.serve({ port: 4101 });
    const app = await env.start(EchoApp, {
      components: {
        listener: { values: { port: 7 } },
        device: { values: { host: 'analyzer.lab', port: 4101 } },
      },
    });
    const conn = await device.connection();
    await conn.receive();
    conn.send('result 42');
    await env.waitForEvent(app.device!, 'data');
    expect(env.dashboard(app, 'device/connection/link')).toMatchObject({
      value: { status: 'ok', text: 'Connected to analyzer.lab:4101' },
    });
    expect(env.dashboard(app, 'device/connection/sent')).toMatchObject({
      value: 'hello'.length,
    });
    expect(env.dashboard(app, 'device/connection/received')).toMatchObject({
      value: 'result 42'.length,
    });
    /* Counted in the worker, written as one point an interval */
    env.flushCounts(app);
    expect(env.dashboard(app, 'device/connection/traffic')).toMatchObject({
      kind: 'series',
      series: {
        received: [[expect.any(Number), 'result 42'.length]],
        sent: [[expect.any(Number), 'hello'.length]],
      },
    });
    expect(env.dashboardIssues(app)).toEqual({});
  });

  it("should list a server's connections while they are open", async () => {
    const app = await env.start(EchoApp, {
      components: { listener: { values: { port: 7 } } },
    });
    expect(env.dashboard(app, 'listener/connections/count')).toMatchObject({
      value: 0,
    });
    const conn = await env.connect(app, 'listener');
    expect((await conn.request('ping')).toString()).toBe('PING');
    expect(env.dashboard(app, 'listener/connections/count')).toMatchObject({
      value: 1,
    });
    expect(
      env.dashboard(app, 'listener/connections/connections'),
    ).toMatchObject({
      kind: 'table',
      rows: [
        {
          row: {
            peer: expect.stringMatching(/^127\.0\.0\.1:\d+$/),
            received: 4,
            sent: 4,
          },
        },
      ],
    });

    env.flushCounts(app);
    expect(env.dashboard(app, 'listener/connections/traffic')).toMatchObject({
      series: {
        received: [[expect.any(Number), 4]],
        sent: [[expect.any(Number), 4]],
      },
    });

    conn.close();
    await env.waitForEvent(app.listener, 'disconnect');
    expect(env.dashboard(app, 'listener/connections/count')).toMatchObject({
      value: 0,
    });
    expect(env.dashboard(app, 'listener/connections/connections')).toEqual({
      kind: 'table',
      rows: [],
    });
  });
});
