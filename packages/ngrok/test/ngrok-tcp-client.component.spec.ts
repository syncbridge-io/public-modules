import { Buffer } from 'node:buffer';
import net from 'node:net';
import { mock } from 'node:test';
import ngrok from '@ngrok/ngrok';
import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { NgrokTcpClientComponent } from '../src/index.js';

/** What the ngrok agent would be given and hand back, in place of the real one */
class FakeNgrok {
  options: any[] = [];
  closed = 0;
  failures: Error[] = [];
  /** Held back until released, to stop the component while it waits */
  gate?: Promise<void>;
  private readonly original = ngrok.forward;

  install() {
    (ngrok as any).forward = async (options: any) => {
      this.options.push(options);
      await this.gate;
      const failure = this.failures.shift();
      if (failure) throw failure;
      return {
        url: () => 'tcp://0.tcp.ngrok.io:12345',
        close: async () => {
          this.closed++;
        },
      };
    };
  }

  restore() {
    (ngrok as any).forward = this.original;
  }
}

/** Polls with setImmediate, as the tests below stop the timers */
async function until(condition: () => boolean, what: string) {
  const deadline = Date.now() + 3000;
  while (!condition() && Date.now() < deadline)
    await new Promise(resolve => setImmediate(resolve));
  if (!condition()) throw new Error(`Timed out waiting for ${what}`);
}

describe('NgrokTcpClientComponent', () => {
  let fake: FakeNgrok;
  let component: NgrokTcpClientComponent;
  let records: LogChannel.Record[];

  beforeEach(async () => {
    fake = new FakeNgrok();
    fake.install();
    component = new NgrokTcpClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'ngrok',
      path: 'ngrok',
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
    expect(component.peerAddress).toBe('tcp://0.tcp.ngrok.io:12345');
    expect(fake.options[0]).toMatchObject({
      proto: 'tcp',
      authtoken: 'token-1',
      addr: localPort(),
    });

    await component.stop();
    expect(fake.closed).toBe(1);
    expect(component.peerAddress).toBeUndefined();
  });

  it('should not leave a tunnel open when stopped while it is being opened', async () => {
    let release!: () => void;
    fake.gate = new Promise<void>(resolve => (release = resolve));
    await component.start();
    await until(() => fake.options.length === 1, 'the tunnel request');

    await component.stop();
    release();
    await until(() => fake.closed === 1, 'the tunnel to be closed');
    expect(component.peerAddress).toBeUndefined();
  });

  it('should try again after it fails to open a tunnel', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    fake.failures.push(new Error('authentication failed'));
    await component.start();
    await until(() => fake.options.length === 1, 'the first attempt');
    await new Promise(resolve => setImmediate(resolve));
    expect(component.peerAddress).toBeUndefined();

    mock.timers.tick(5000);
    await until(() => !!component.peerAddress, 'the second attempt');
    expect(fake.options.length).toBe(2);
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

  it('should follow the state of the tunnel', async () => {
    await component.start();
    await until(() => fake.options.length === 1, 'the tunnel request');
    const events: string[] = [];
    component.on('connect', () => events.push('connect'));
    component.on('disconnect', () => events.push('disconnect'));

    fake.options[0].onStatusChange('closed');
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toBe('Ngrok tunnel disconnected');

    fake.options[0].onStatusChange('connected');
    expect(component.status).toBe('started');
    expect(events).toEqual(['disconnect', 'connect']);
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

    expect(records.map(r => [r.direction, String(r.data)])).toEqual([
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
    expect(fake.closed).toBe(1);
    expect(fake.options[1].authtoken).toBe('token-2');
  });
});
