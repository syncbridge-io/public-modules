import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { RedisSentinelComponent } from '../src/index.js';
import { FakeRedis } from './_fixtures/fake-redis.js';

describe('RedisSentinelComponent', () => {
  let master: FakeRedis;
  let sentinel: FakeRedis;
  let component: RedisSentinelComponent;
  let records: LogChannel.Record[];

  beforeEach(async () => {
    master = await new FakeRedis().listen();
    sentinel = await new FakeRedis().listen();
    sentinel.master = { host: '127.0.0.1', port: master.port };
    component = new RedisSentinelComponent({
      app: {} as any,
      parent: {} as any,
      name: 'redis',
      path: 'redis',
      values: {
        name: 'mymaster',
        sentinels: [{ host: '127.0.0.1', port: sentinel.port }],
        password: 'secret',
      },
    });
    records = [];
    Object.defineProperty(component, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    await component.init();
  });

  afterEach(async () => {
    await component.stop();
    await master.close();
    await sentinel.close();
  });

  it('should not connect until it is started', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(sentinel.connections).toBe(0);
    expect(master.connections).toBe(0);
  });

  it('should ask the sentinel for the master, and connect to it', async () => {
    await component.start();
    expect(component.status).toBe('started');
    expect(
      sentinel.commands.find(c => c[0].toUpperCase() === 'SENTINEL'),
    ).toEqual(['sentinel', 'get-master-addr-by-name', 'mymaster']);
    expect(master.connections).toBeGreaterThan(0);
    expect(records.map(r => r.event)).toEqual(['connect']);
  });

  it('should quit when stopped', async () => {
    await component.start();
    await component.stop();
    expect(component.status).toBe('stopped');
    expect(master.commands.map(c => c[0].toUpperCase())).toContain('QUIT');
  });

  it('should start again after it was stopped', async () => {
    await component.start();
    await component.stop();
    await component.start();
    expect(component.status).toBe('started');
  });
});
