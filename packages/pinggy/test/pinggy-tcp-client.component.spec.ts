import { Buffer } from 'node:buffer';
import net from 'node:net';
import { mock } from 'node:test';
import { pinggy } from '@pinggy/pinggy';
import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { PinggyTcpClientComponent } from '../src/index.js';

/** A tunnel the way Pinggy hands it back, and what it was asked for */
class FakeTunnel {
  status = 'live';
  stopped = 0;
  errorCallback?: (payload: any) => void;
  urls = async () => ['rng.a.pinggy.link:4321'];
  getStatus = async () => this.status;
  stop = async () => {
    this.stopped++;
  };
  setTunnelErrorCallback = (callback: (payload: any) => void) => {
    this.errorCallback = callback;
  };
}

/** The Pinggy SDK replaced: every forward() gives one of these tunnels */
class FakePinggy {
  options: any[] = [];
  tunnels: FakeTunnel[] = [];
  failures: Error[] = [];
  /** Held back until released, to stop the component while it waits */
  gate?: Promise<void>;
  private readonly original = pinggy.forward;

  install() {
    (pinggy as any).forward = async (options: any) => {
      this.options.push(options);
      await this.gate;
      const failure = this.failures.shift();
      if (failure) throw failure;
      const tunnel = new FakeTunnel();
      this.tunnels.push(tunnel);
      return tunnel;
    };
  }

  restore() {
    (pinggy as any).forward = this.original;
  }
}

/** Polls with setImmediate, as the tests below stop the timers */
async function until(condition: () => boolean, what: string) {
  const deadline = Date.now() + 3000;
  while (!condition() && Date.now() < deadline)
    await new Promise(resolve => setImmediate(resolve));
  if (!condition()) throw new Error(`Timed out waiting for ${what}`);
}

describe('PinggyTcpClientComponent', () => {
  let fake: FakePinggy;
  let component: PinggyTcpClientComponent;
  let records: LogChannel.Record[];

  beforeEach(async () => {
    fake = new FakePinggy();
    fake.install();
    component = new PinggyTcpClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'pinggy',
      path: 'pinggy',
      values: { authToken: 'token-1', localPort: 0 },
    });
    records = [];
    Object.defineProperty(component, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    await component.init();
  });

  afterEach(async () => {
    mock.timers.reset();
    await component.stop();
    fake.restore();
  });

  /** The local port the tunnel is given, where the agent would connect */
  const localPort = () =>
    ((component as any)._server.address() as net.AddressInfo).port;

  it('should open a tunnel to its local port, and close it when stopped', async () => {
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');
    expect(component.peerAddress).toBe('tcp://rng.a.pinggy.link:4321');
    expect(fake.options[0]).toMatchObject({
      token: 'token-1',
      forwarding: `tcp://localhost:${localPort()}`,
    });

    await component.stop();
    expect(fake.tunnels[0].stopped).toBe(1);
    expect(component.peerAddress).toBeUndefined();
  });

  it('should not leave a tunnel open when stopped while it is being opened', async () => {
    let release!: () => void;
    fake.gate = new Promise<void>(resolve => (release = resolve));
    await component.start();
    await until(() => fake.options.length === 1, 'the tunnel request');

    await component.stop();
    release();
    await until(
      () => fake.tunnels[0]?.stopped === 1,
      'the tunnel to be closed',
    );
    expect(component.peerAddress).toBeUndefined();
  });

  it('should try again after it fails to open a tunnel', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    fake.failures.push(new Error('invalid token'));
    await component.start();
    await until(() => fake.options.length === 1, 'the first attempt');
    await new Promise(resolve => setImmediate(resolve));
    expect(component.peerAddress).toBeUndefined();

    mock.timers.tick(5000);
    await until(() => !!component.peerAddress, 'the second attempt');
    expect(fake.options.length).toBe(2);
  });

  it('should be unhealthy while it cannot open a tunnel, and started once it can', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    fake.failures.push(new Error('invalid token'));
    const events: string[] = [];
    component.on('connect', () => events.push('connect'));
    await component.start();
    await until(() => fake.options.length === 1, 'the first attempt');
    await until(() => component.status === 'unhealthy', 'unhealthy');
    expect(component.statusMessage).toMatch(/invalid token/);
    expect(events).toEqual([]);

    mock.timers.tick(5000);
    await until(() => component.status === 'started', 'started');
    expect(events).toEqual(['connect']);
    expect(records.map(r => r.event)).toEqual(['connect']);
  });

  it('should not try again once stopped', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    fake.failures.push(new Error('offline'));
    await component.start();
    await until(() => fake.options.length === 1, 'the first attempt');
    await new Promise(resolve => setImmediate(resolve));

    await component.stop();
    mock.timers.tick(10000);
    await new Promise(resolve => setImmediate(resolve));
    expect(fake.options.length).toBe(1);
  });

  it('should follow the status of the tunnel', async () => {
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');
    const events: string[] = [];
    component.on('connect', () => events.push('connect'));
    component.on('disconnect', () => events.push('disconnect'));

    fake.tunnels[0].status = 'closed';
    await until(() => component.status === 'unhealthy', 'unhealthy');
    expect(component.statusMessage).toBe('Tunnel disconnected');

    fake.tunnels[0].status = 'live';
    await until(() => component.status === 'started', 'started again');
    expect(events).toEqual(['disconnect', 'connect']);
  });

  it('should open a new tunnel after an error it cannot recover from', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');
    const errors: Error[] = [];
    component.on('error', err => errors.push(err as Error));

    fake.tunnels[0].errorCallback!({
      errorNo: 1,
      error: 'recoverable',
      recoverable: true,
    });
    mock.timers.tick(1000);
    await new Promise(resolve => setImmediate(resolve));
    expect(fake.options.length).toBe(1);

    fake.tunnels[0].errorCallback!({
      errorNo: 2,
      error: 'fatal',
      recoverable: false,
    });
    mock.timers.tick(1000);
    await until(() => fake.options.length === 2, 'the new tunnel');
    expect(errors.map(e => e.message)).toEqual(['recoverable', 'fatal']);
    expect(fake.tunnels[0].stopped).toBe(1);
  });

  it('should not open a tunnel for an error that arrives once stopped', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');
    const tunnel = fake.tunnels[0];

    await component.stop();
    tunnel.errorCallback!({ errorNo: 2, error: 'fatal', recoverable: false });
    mock.timers.tick(1000);
    await new Promise(resolve => setImmediate(resolve));
    expect(fake.options.length).toBe(1);
  });

  it('should read what the agent sends, and write to it', async () => {
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');
    const agent = net.connect(localPort(), '127.0.0.1');
    await new Promise(resolve => agent.once('connect', resolve));
    await until(() => component.connected, 'the agent');

    const read = new Promise<Buffer>(resolve =>
      component.once('data', data => resolve(data)),
    );
    agent.write('from the tunnel');
    expect(String(await read)).toBe('from the tunnel');

    const written = new Promise<Buffer>(resolve =>
      agent.once('data', data => resolve(data as Buffer)),
    );
    component.write('to the tunnel');
    expect(String(await written)).toBe('to the tunnel');

    expect(
      records
        .filter(r => r.direction !== 'info')
        .map(r => [r.direction, String(r.data)]),
    ).toEqual([
      ['in', 'from the tunnel'],
      ['out', 'to the tunnel'],
    ]);
    agent.destroy();
  });

  it('should not write while no agent is connected', async () => {
    await component.start();
    expect(() => component.write('nobody')).toThrow(/not connected/);
  });

  it('should stop while the agent stays connected', async () => {
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');
    const agent = net.connect(localPort(), '127.0.0.1');
    await new Promise(resolve => agent.once('connect', resolve));
    await until(() => component.connected, 'the agent');

    await component.stop();
    expect(component.status).toBe('stopped');
    agent.destroy();
  });

  it('should open a new tunnel when its values change', async () => {
    await component.start();
    await until(() => !!component.peerAddress, 'the tunnel');

    component.values.authToken = 'token-2';
    component.emit('values-updated', ['authToken']);
    await until(() => fake.options.length === 2, 'the new tunnel');
    expect(fake.tunnels[0].stopped).toBe(1);
    expect(fake.options[1].token).toBe('token-2');
  });
});
