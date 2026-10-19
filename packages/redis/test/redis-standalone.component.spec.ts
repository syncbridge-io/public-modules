import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { RedisStandaloneComponent } from '../src/index.js';
import { FakeRedis } from './_fixtures/fake-redis.js';

async function until(condition: () => boolean, what: string) {
  const deadline = Date.now() + 3000;
  while (!condition() && Date.now() < deadline)
    await new Promise(resolve => setTimeout(resolve, 5));
  if (!condition()) throw new Error(`Timed out waiting for ${what}`);
}

describe('RedisStandaloneComponent', () => {
  let redis: FakeRedis;
  let component: RedisStandaloneComponent;
  let records: LogChannel.Record[];

  function create(values: Record<string, unknown> = {}) {
    component = new RedisStandaloneComponent({
      app: {} as any,
      parent: {} as any,
      name: 'redis',
      path: 'redis',
      values: { host: '127.0.0.1', port: redis.port, ...values },
    });
    records = [];
    Object.defineProperty(component, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    return component;
  }

  beforeEach(async () => {
    redis = await new FakeRedis().listen();
  });

  afterEach(async () => {
    await component.stop();
    await redis.close();
  });

  it('should not connect until it is started', async () => {
    await create().init();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(redis.connections).toBe(0);
  });

  it('should be started once connected, and write it to its channel', async () => {
    await create().init();
    await component.start();
    expect(component.status).toBe('started');
    expect(records.map(r => [r.event, r.message])).toEqual([
      ['connect', 'Connected'],
    ]);
  });

  it('should log in with its user name and password', async () => {
    await create({ username: 'app', password: 'secret' }).init();
    await component.start();
    /* ioredis sends them with HELLO: HELLO 3 AUTH app secret */
    const login = redis.commands.find(c => c.includes('secret'));
    expect(login?.slice(-3)).toEqual(['AUTH', 'app', 'secret']);
  });

  it('should connect plain when TLS is not enabled, whatever its TLS options', async () => {
    await create({
      tls_enabled: false,
      tls: { rejectUnauthorized: false },
    }).init();
    await component.start();
    expect(component.status).toBe('started');
  });

  it('should quit and write the disconnection to its channel when stopped', async () => {
    await create().init();
    await component.start();
    await component.stop();
    expect(component.status).toBe('stopped');
    expect(redis.commands.map(c => c[0].toUpperCase())).toContain('QUIT');
    await until(() => records.length === 2, 'the disconnection');
    expect(records.map(r => r.event)).toEqual(['connect', 'disconnect']);
  });

  it('should be unhealthy when the connection is lost', async () => {
    await create({ retryStrategy: () => null }).init();
    await component.start();
    redis.drop();
    await until(() => component.status === 'unhealthy', 'unhealthy');
  });

  it('should not keep trying to connect when it fails to start', async () => {
    const unused = await new FakeRedis().listen();
    const port = unused.port;
    await unused.close();
    create({ port, retryStrategy: () => 20, maxRetriesPerRequest: 0 });
    await component.init();
    await expect(component.start()).rejects.toBeDefined();
    expect(component.status).toBe('stopped');
    await until(() => (component.client as any).status === 'end', 'the end');
  });

  it('should start again after it was stopped', async () => {
    await create().init();
    await component.start();
    await component.stop();
    await component.start();
    expect(component.status).toBe('started');
  });
});
