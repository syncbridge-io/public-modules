import net from 'node:net';
import type { LogChannel } from '@syncbridge/common';
import { expect } from 'expect';
import { HL7Message } from 'hl7v2';
import { Hl7Client } from 'hl7v2-net';
import { HL7ServerComponent } from '../src/index.js';

/** In enhanced mode: an accept acknowledgment always, no application one */
const ORU_ENHANCED =
  'MSH|^~\\&|MONITOR|ICU|SB|HOSP|20261011120000||ORU^R01|MSG0002|P|2.5|||AL|NE\r' +
  'PID|1||12345^^^HOSP^MR||DOE^JOHN\r' +
  'OBR|1|||8867-4^Heart rate^LN\r' +
  'OBX|1|NM|8867-4^Heart rate^LN||72|/min|||||F';

const ORU =
  'MSH|^~\\&|MONITOR|ICU|SB|HOSP|20261011120000||ORU^R01|MSG0001|P|2.5\r' +
  'PID|1||12345^^^HOSP^MR||DOE^JOHN\r' +
  'OBR|1|||8867-4^Heart rate^LN\r' +
  'OBX|1|NM|8867-4^Heart rate^LN||72|/min|||||F';

describe('HL7ServerComponent', () => {
  let server: HL7ServerComponent;
  let client: Hl7Client | undefined;

  async function startServer(values: Record<string, any> = {}) {
    server = new HL7ServerComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Server',
      path: 'hl7Server',
      values: { port: 0, bindInterface: '127.0.0.1', ...values },
    });
    await server.init();
    await server.start();
  }

  async function connect() {
    const { port } = server.server.address() as net.AddressInfo;
    client = Hl7Client.createClient({ host: '127.0.0.1', port });
    await client.connect();
    return client;
  }

  beforeEach(() => startServer());

  afterEach(async () => {
    await client?.close();
    client = undefined;
    await server.stop();
  });

  it('should receive a message over MLLP and acknowledge it', async () => {
    const received: HL7Message[] = [];
    server.use((req, res) => {
      received.push(req.message);
      res.message = req.message.createAck();
    });
    await connect();

    const ack = await client!.sendMessageWaitAck(HL7Message.parse(ORU));
    expect(received).toHaveLength(1);
    expect(received[0].messageType).toBe('ORU^R01');
    expect(ack.get('MSA-1')).toBe('AA');
    expect(ack.get('MSA-2')).toBe('MSG0001');
    /* 2.0 answers with the request's applications swapped */
    expect(ack.get('MSH-3')).toBe('SB');
    expect(ack.get('MSH-5')).toBe('MONITOR');
  });

  it('should write what it receives and answers to its communication channel', async () => {
    /* An app factory assigns the channel; here a stand-in collects */
    const records: LogChannel.Record[] = [];
    Object.defineProperty(server, 'communicationLog', {
      value: { write: (r: LogChannel.Record) => records.push(r) },
    });
    server.use((req, res) => {
      res.message = req.message.createAck();
    });
    await connect();
    await client!.sendMessageWaitAck(HL7Message.parse(ORU));

    expect(records.map(r => r.event ?? r.direction)).toEqual([
      'connect',
      'in',
      'out',
    ]);
    expect(String(records[1].data)).toContain('MSG0001');
    expect(String(records[2].data)).toContain('MSA|AA|MSG0001');
    expect(records[0].details).toMatch(/^127\.0\.0\.1:\d+$/);
    expect(records[1].details).toBe(records[0].details);
  });

  it('should accept a message only once it is handled', async () => {
    let handled = false;
    server.use(async () => {
      handled = true;
    });
    await connect();
    const ack = await client!.sendMessageWaitAck(
      HL7Message.parse(ORU_ENHANCED),
    );
    expect(handled).toBe(true);
    expect(ack.get('MSA-1')).toBe('CA');
    expect(ack.get('MSA-2')).toBe('MSG0002');
  });

  it('should answer CE when the handler fails', async () => {
    server.use(() => {
      throw new Error('The HIS did not store it');
    });
    await connect();
    const ack = await client!.sendMessageWaitAck(
      HL7Message.parse(ORU_ENHANCED),
    );
    expect(ack.get('MSA-1')).toBe('CE');
  });

  it("should accept on receipt when set to 'receipt'", async () => {
    await server.stop();
    await startServer({ acceptAcknowledgment: 'receipt' });
    server.use(() => {
      throw new Error('The HIS did not store it');
    });
    await connect();
    const ack = await client!.sendMessageWaitAck(
      HL7Message.parse(ORU_ENHANCED),
    );
    expect(ack.get('MSA-1')).toBe('CA');
  });

  it('should keep its handlers when its values change', async () => {
    const received: string[] = [];
    server.use((req, res) => {
      received.push(req.message.get('MSH-10') as string);
      res.message = req.message.createAck();
    });
    const before = server.server;
    server.values.responseTimeout = 20000;
    await server.emitAsync('values-updated', ['responseTimeout']);
    expect(server.server).not.toBe(before);

    await connect();
    const ack = await client!.sendMessageWaitAck(HL7Message.parse(ORU));
    expect(received).toEqual(['MSG0001']);
    expect(ack.get('MSA-1')).toBe('AA');
  });

  describe('a device that expects AA/AE in enhanced mode', () => {
    /* GE B125 and Mindray eGateway send MSH-15 AL / MSH-16 NE but only know
     * AA (stored) and AE (resend) */
    const originalCodes = () =>
      server.beforeResponse(res => {
        const code = res.get('MSA-1');
        if (code === 'CA') res.set('MSA-1', 'AA');
        if (code === 'CE') res.set('MSA-1', 'AE');
      });

    it('should answer AA once the message is stored', async () => {
      originalCodes();
      server.use(async () => undefined);
      await connect();
      const ack = await client!.sendMessageWaitAck(
        HL7Message.parse(ORU_ENHANCED),
      );
      expect(ack.get('MSA-1')).toBe('AA');
    });

    it('should answer AE when storing fails', async () => {
      originalCodes();
      server.use(() => {
        throw new Error('The HIS did not store it');
      });
      await connect();
      const ack = await client!.sendMessageWaitAck(
        HL7Message.parse(ORU_ENHANCED),
      );
      expect(ack.get('MSA-1')).toBe('AE');
    });

    it('should keep its hooks when its values change', async () => {
      originalCodes();
      server.use(async () => undefined);
      server.values.responseTimeout = 20000;
      await server.emitAsync('values-updated', ['responseTimeout']);
      await connect();
      const ack = await client!.sendMessageWaitAck(
        HL7Message.parse(ORU_ENHANCED),
      );
      expect(ack.get('MSA-1')).toBe('AA');
    });
  });
});

describe('HL7ServerComponent socket settings', () => {
  it('should refuse the addresses it is told to block', async () => {
    const server = new HL7ServerComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Server',
      path: 'hl7Server',
      values: {
        port: 0,
        bindInterface: '127.0.0.1',
        socket: { blockedIps: ['127.0.0.1'] },
      },
    });
    await server.init();
    await server.start();
    const connections: unknown[] = [];
    server.on('connection', info => connections.push(info));
    try {
      const { port } = server.server.address() as net.AddressInfo;
      const socket = net.connect(port, '127.0.0.1');
      socket.on('error', () => undefined);
      await new Promise(resolve => socket.once('close', resolve));
      expect(connections).toEqual([]);
    } finally {
      await server.stop();
    }
  });

  it('should fail to start, not swallow it, when its port is taken', async () => {
    const taken = net.createServer();
    await new Promise<void>(resolve => taken.listen(0, '127.0.0.1', resolve));
    const server = new HL7ServerComponent({
      app: {} as any,
      parent: {} as any,
      name: 'hl7Server',
      path: 'hl7Server',
      values: {
        port: (taken.address() as net.AddressInfo).port,
        bindInterface: '127.0.0.1',
      },
    });
    try {
      await server.init();
      await expect(server.start()).rejects.toThrow(/EADDRINUSE/);
    } finally {
      await server.stop();
      await new Promise(resolve => taken.close(resolve));
    }
  });
});
