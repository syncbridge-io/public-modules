import net from 'node:net';
import { CLASS_METADATA, ComponentMetadata } from '@syncbridge/common';
import { expect } from 'expect';
import { HL7Message } from 'hl7v2';
import type { HL7Socket } from 'hl7v2-net';
import {
  HL7ClientComponent,
  HL7EndpointComponent,
  HL7ServerComponent,
} from '../src/index.js';

const ORU =
  'MSH|^~\\&|MONITOR|ICU|SB|HOSP|20261011120000||ORU^R01|MSG0001|P|2.5\r' +
  'PID|1||12345^^^HOSP^MR||DOE^JOHN\r' +
  'OBR|1|||8867-4^Heart rate^LN\r' +
  'OBX|1|NM|8867-4^Heart rate^LN||72|/min|||||F';

function metadataOf(ctor: Function): ComponentMetadata {
  return Reflect.getMetadata(CLASS_METADATA, ctor);
}

/** Resolves when `condition` holds, polling */
async function until(condition: () => boolean) {
  const deadline = Date.now() + 5000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

describe('HL7EndpointComponent', () => {
  let server: HL7ServerComponent;
  let client: HL7ClientComponent;

  beforeEach(async () => {
    server = new HL7ServerComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Server',
      path: 'hl7Server',
      values: { port: 0, bindInterface: '127.0.0.1' },
    });
    await server.init();
    await server.start();
    client = new HL7ClientComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Client',
      path: 'hl7Client',
      values: {
        host: '127.0.0.1',
        port: (server.server.address() as net.AddressInfo).port,
        reconnect: { initialDelay: 30000, maxDelay: 60000 },
      },
    });
    await client.init();
  });

  afterEach(async () => {
    await client.stop();
    await server.stop();
  });

  it('should be an abstract component both the client and the server extend', () => {
    const base = metadataOf(HL7EndpointComponent);
    expect(base.abstract).toBe(true);
    expect(base.className).toBe('HL7Endpoint');
    expect(client).toBeInstanceOf(HL7EndpointComponent);
    expect(server).toBeInstanceOf(HL7EndpointComponent);
    for (const ctor of [HL7ClientComponent, HL7ServerComponent]) {
      const metadata = metadataOf(ctor);
      expect(metadata.abstract).toBeFalsy();
      expect(metadata.logChannels?.communication).toBeDefined();
    }
  });

  it('should receive messages the same way on either side', async () => {
    /* What an app does with a slot typed by the base */
    const receive = (endpoint: HL7EndpointComponent) => {
      const received: string[] = [];
      endpoint.use((req, res) => {
        received.push(req.message.messageType);
        res.message = req.message.createAck();
      });
      return received;
    };
    const byServer = receive(server);
    const byClient = receive(client);
    const socket = new Promise<HL7Socket>(resolve =>
      server.once('connection', (_info, s) => resolve(s)),
    );
    await client.start();
    await until(() => client.connected);

    let ack = await client.client.sendMessageWaitAck(HL7Message.parse(ORU));
    expect(ack.get('MSA-1')).toBe('AA');
    expect(byServer).toEqual(['ORU^R01']);

    ack = await (await socket).sendMessageWaitAck(HL7Message.parse(ORU));
    expect(ack.get('MSA-1')).toBe('AA');
    expect(byClient).toEqual(['ORU^R01']);
  });

  it('should tell whether a peer is connected', async () => {
    expect(server.connected).toBe(false);
    expect(client.connected).toBe(false);
    await client.start();
    await until(() => client.connected && server.connected);

    await client.stop();
    await until(() => !server.connected);
    expect(client.connected).toBe(false);
  });
});
