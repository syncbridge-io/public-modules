import { Buffer } from 'node:buffer';
import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { IoClientBaseComponent, IoServerBaseComponent } from '../src/index.js';

/** A component outside an app: the channel is a stand-in that collects */
async function create<T extends IoClientBaseComponent | IoServerBaseComponent>(
  Class: new (init: any) => T,
  props: object = {},
) {
  const component = new Class({
    app: {} as any,
    parent: {} as any,
    name: 'io',
    path: 'io',
    values: {},
  });
  const records: LogChannel.Record[] = [];
  Object.defineProperty(component, 'communicationLog', {
    value: { write: (r: LogChannel.Record) => records.push(r) },
  });
  for (const [key, value] of Object.entries(props))
    Object.defineProperty(component, key, { value });
  await component.init();
  return { component, records };
}

describe('IoClientBaseComponent', () => {
  it('should write what it reads and transmits to its communication channel', async () => {
    const { component, records } = await create(IoClientBaseComponent);
    component.emit('data', Buffer.from('in'), { address: '10.0.0.5', port: 1 });
    component.emit('transmit', Buffer.from('out'), '10.0.0.5:1');
    expect(records.map(r => [r.direction, String(r.data), r.details])).toEqual([
      ['in', 'in', '10.0.0.5:1'],
      ['out', 'out', '10.0.0.5:1'],
    ]);
  });

  it('should write its connections and disconnections, with what it is connected to', async () => {
    const { component, records } = await create(IoClientBaseComponent, {
      peerAddress: 'COM3',
    });
    component.emit('connect');
    component.emit('disconnect');
    component.emit('disconnect', new Error('lost'));
    expect(records.map(r => [r.event, r.message, r.details])).toEqual([
      ['connect', 'Connected', 'COM3'],
      ['disconnect', 'Disconnected', 'COM3'],
      ['disconnect', 'Disconnected: lost', 'COM3'],
    ]);
  });

  it('should not support writing until a component says it does', async () => {
    const { component } = await create(IoClientBaseComponent);
    expect(() => component.write('x')).toThrow(/do not support write/);
  });

  it('should work without a communication channel', async () => {
    const component = new IoClientBaseComponent({
      app: {} as any,
      parent: {} as any,
      name: 'io',
      path: 'io',
      values: {},
    });
    await component.init();
    expect(() => component.emit('data', Buffer.from('x'))).not.toThrow();
  });
});

describe('IoServerBaseComponent', () => {
  it('should write what it reads and transmits to its communication channel', async () => {
    const { component, records } = await create(IoServerBaseComponent);
    component.emit('data', Buffer.from('in'), { address: '10.0.0.7', port: 9 });
    component.emit('transmit', Buffer.from('out'), { address: '10.0.0.7' });
    expect(records.map(r => [r.direction, String(r.data), r.details])).toEqual([
      ['in', 'in', '10.0.0.7:9'],
      ['out', 'out', '10.0.0.7'],
    ]);
  });
});
