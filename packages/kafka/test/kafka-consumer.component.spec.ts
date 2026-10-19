import { EventEmitter } from 'node:events';
import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { KafkaConsumerComponent } from '../src/index.js';

/** The messages a consumer reads, as the client's stream tells them */
class FakeStream extends EventEmitter {
  closed = 0;
  async close() {
    this.closed++;
  }
}

/** Where nothing listens: the real client is built, and never reaches a broker */
const CONNECTION = {
  brokers: ['127.0.0.1:1'],
  timeout: 1,
  retries: 0,
  retryDelay: 0.01,
  metadataMaxAge: 5,
  connectTimeout: 0.2,
  requestTimeout: 1,
  maxInflights: 5,
};

async function until(condition: () => boolean, what: string) {
  const deadline = Date.now() + 3000;
  while (!condition() && Date.now() < deadline)
    await new Promise(resolve => setTimeout(resolve, 5));
  if (!condition()) throw new Error(`Timed out waiting for ${what}`);
}

describe('KafkaConsumerComponent', () => {
  let component: KafkaConsumerComponent;
  let records: LogChannel.Record[];
  let stream: FakeStream;

  /** The client the component made, taken in place of the broker */
  function takeConsumer() {
    const consumer: any = component.consumer;
    stream = new FakeStream();
    consumer.consume = async () => stream;
    consumer.close = async () => undefined;
    return consumer;
  }

  beforeEach(async () => {
    component = new KafkaConsumerComponent({
      app: {} as any,
      parent: {} as any,
      name: 'consumer',
      path: 'consumer',
      values: {
        connection: CONNECTION,
        groupId: 'group-1',
        topics: ['orders'],
        mode: 'latest',
        autocommit: true,
        maxWaitTime: 0.1,
        sessionTimeout: 10,
        rebalanceTimeout: 10,
        heartbeatInterval: 1,
      },
    });
    records = [];
    Object.defineProperty(component, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    await component.init();
  });

  afterEach(async () => {
    (component.consumer as any).close = async () => undefined;
    await component.stop();
  });

  it('should tell the messages it reads, and write them to its channel', async () => {
    const consumer = takeConsumer();
    await component.start();
    const messages: any[] = [];
    component.on('message', message => messages.push(message));

    stream.emit('data', {
      topic: 'orders',
      partition: 1,
      offset: 7n,
      value: Buffer.from('order-1'),
    });
    await until(() => messages.length === 1, 'the message');

    expect(messages[0].topic).toBe('orders');
    expect(records.map(r => [r.direction, String(r.data), r.details])).toEqual([
      ['in', 'order-1', 'orders[1]@7'],
    ]);
    expect(consumer).toBe(component.consumer);
  });

  it('should be started once a broker is connected, and write it to its channel', async () => {
    const consumer = takeConsumer();
    await component.start();
    consumer.emit('client:broker:connect');
    expect(component.status).toBe('started');
    expect(records.map(r => [r.event, r.message])).toEqual([
      ['connect', 'Connected'],
    ]);
  });

  it('should be unhealthy when a broker fails or is lost', async () => {
    const consumer = takeConsumer();
    await component.start();

    consumer.emit('client:broker:failed');
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toBe('Kafka broker failed');

    consumer.emit('client:broker:connect');
    consumer.emit('client:broker:disconnect');
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toMatch(/disconnected unexpectedly/);
    expect(records.map(r => r.event ?? r.direction)).toContain('error');
  });

  it('should treat a disconnect as expected while it stops, and as lost again after it starts', async () => {
    const consumer = takeConsumer();
    await component.start();
    await component.stop();
    consumer.emit('client:broker:disconnect');
    expect(component.status).toBe('stopped');

    const next = takeConsumer();
    await component.start();
    next.emit('client:broker:connect');
    next.emit('client:broker:disconnect');
    expect(component.status).toBe('unhealthy');
  });

  it('should be unhealthy, not crash, when the stream fails', async () => {
    takeConsumer();
    await component.start();
    stream.emit('error', new Error('stream broke'));
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toBe('stream broke');
  });

  it('should close its stream and its client when stopped', async () => {
    const consumer = takeConsumer();
    let closed = 0;
    consumer.close = async () => {
      closed++;
    };
    await component.start();
    await component.stop();
    expect(stream.closed).toBe(1);
    expect(closed).toBe(1);
  });

  it('should make a new client when its values change', async () => {
    const before = takeConsumer();
    let closed = 0;
    before.close = async () => {
      closed++;
    };
    await component.start();

    component.values.groupId = 'group-2';
    component.emit('values-updated', ['groupId']);
    await until(() => component.consumer !== before, 'the new client');
    expect(closed).toBe(1);
    expect(stream.closed).toBe(1);
  });

  it('should be unhealthy, not reject, when the old client cannot be closed', async () => {
    const before = takeConsumer();
    before.close = async () => {
      throw new Error('close failed');
    };
    await component.start();

    component.emit('values-updated', ['groupId']);
    await until(() => component.status === 'unhealthy', 'unhealthy');
    expect(component.statusMessage).toBe('close failed');
  });
});
