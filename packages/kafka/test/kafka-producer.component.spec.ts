import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { KafkaProducerComponent } from '../src/index.js';

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

describe('KafkaProducerComponent', () => {
  let component: KafkaProducerComponent;
  let records: LogChannel.Record[];

  /** The client the component made, taken in place of the broker */
  function takeProducer(overrides: Record<string, unknown> = {}) {
    const producer: any = component.producer;
    producer.listApis = async () => [];
    producer.send = async () => ({ offsets: [] });
    producer.close = async () => undefined;
    return Object.assign(producer, overrides);
  }

  beforeEach(async () => {
    component = new KafkaProducerComponent({
      app: {} as any,
      parent: {} as any,
      name: 'producer',
      path: 'producer',
      /* No producer id, epoch nor acks: they are optional */
      values: { connection: CONNECTION },
    });
    records = [];
    Object.defineProperty(component, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    await component.init();
  });

  afterEach(async () => {
    (component.producer as any).close = async () => undefined;
    await component.stop();
  });

  it('should be made without a producer id, an epoch or acks', () => {
    expect(component.producer).toBeDefined();
  });

  it('should write the messages it sent to its channel, once they are sent', async () => {
    takeProducer();
    await component.start();
    await component.send({
      messages: [
        { topic: 'orders', partition: 0, value: Buffer.from('order-1') },
        { topic: 'orders', value: Buffer.from('order-2') },
      ],
    });
    expect(records.map(r => [r.direction, String(r.data), r.details])).toEqual([
      ['out', 'order-1', 'orders[0]'],
      ['out', 'order-2', 'orders'],
    ]);
  });

  it('should not write messages that could not be sent', async () => {
    takeProducer({
      send: async () => {
        throw new Error('broker refused');
      },
    });
    await component.start();
    await expect(
      component.send({
        messages: [{ topic: 'orders', value: Buffer.from('lost') }],
      }),
    ).rejects.toThrow('broker refused');
    expect(records).toEqual([]);
  });

  it('should be unhealthy when its first request to the broker fails', async () => {
    takeProducer({
      listApis: async () => {
        throw new Error('no broker');
      },
    });
    await component.start();
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toBe('no broker');
  });

  it('should follow its brokers, and write them to its channel', async () => {
    const producer = takeProducer();
    await component.start();

    producer.emit('client:broker:connect');
    expect(component.status).toBe('started');
    producer.emit('client:broker:failed');
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toBe('Kafka broker failed');
    producer.emit('client:broker:connect');
    producer.emit('client:broker:disconnect');
    expect(component.statusMessage).toMatch(/disconnected unexpectedly/);

    expect(records.map(r => r.event)).toEqual([
      'connect',
      'error',
      'connect',
      'disconnect',
    ]);
  });

  it('should treat a disconnect as expected while it stops, and as lost again after it starts', async () => {
    const producer = takeProducer();
    await component.start();
    await component.stop();
    producer.emit('client:broker:disconnect');
    expect(component.status).toBe('stopped');

    const next = takeProducer();
    await component.start();
    next.emit('client:broker:connect');
    next.emit('client:broker:disconnect');
    expect(component.status).toBe('unhealthy');
  });

  it('should be unhealthy, not reject, when the old client cannot be closed', async () => {
    takeProducer({
      close: async () => {
        throw new Error('close failed');
      },
    });
    await component.start();
    component.emit('values-updated', ['connection']);
    for (let i = 0; i < 200 && component.status !== 'unhealthy'; i++)
      await new Promise(resolve => setTimeout(resolve, 5));
    expect(component.status).toBe('unhealthy');
    expect(component.statusMessage).toBe('close failed');
  });
});
