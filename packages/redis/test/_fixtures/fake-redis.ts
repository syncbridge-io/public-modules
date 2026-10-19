import net from 'node:net';

/**
 * A Redis server that answers just enough for ioredis to connect, log in and
 * quit, and keeps the commands it was sent: a test's stand-in for a broker.
 */
export class FakeRedis {
  commands: string[][] = [];
  connections = 0;
  /** Answers to Sentinel's `get-master-addr-by-name`: where the master is */
  master?: { host: string; port: number };
  private readonly sockets = new Set<net.Socket>();
  private readonly server = net.createServer(socket => this.accept(socket));

  get port(): number {
    return (this.server.address() as net.AddressInfo).port;
  }

  async listen(): Promise<this> {
    await new Promise<void>(resolve =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
    return this;
  }

  async close(): Promise<void> {
    for (const socket of this.sockets) socket.destroy();
    await new Promise(resolve => this.server.close(resolve));
  }

  /** The connections it has, dropped */
  drop() {
    for (const socket of this.sockets) socket.destroy();
  }

  private accept(socket: net.Socket) {
    this.connections++;
    this.sockets.add(socket);
    socket.once('close', () => this.sockets.delete(socket));
    socket.on('error', () => undefined);
    let pending = Buffer.alloc(0);
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk as Buffer]);
      for (;;) {
        const parsed = parseCommand(pending);
        if (!parsed) return;
        pending = pending.subarray(parsed.length);
        this.commands.push(parsed.command);
        socket.write(this.reply(parsed.command));
        // As Redis does: it hangs up after QUIT
        if (parsed.command[0].toUpperCase() === 'QUIT') socket.end();
      }
    });
  }

  private reply(command: string[]): string {
    const name = command[0].toUpperCase();
    if (name === 'INFO')
      return bulk('# Server\r\nredis_version:7.0.0\r\nloading:0\r\n');
    if (name === 'SENTINEL' && this.master)
      return `*2\r\n${bulk(this.master.host)}${bulk(String(this.master.port))}`;
    if (name === 'ROLE') return `*3\r\n${bulk('master')}:0\r\n*0\r\n`;
    return '+OK\r\n';
  }
}

const bulk = (text: string) => `$${Buffer.byteLength(text)}\r\n${text}\r\n`;

/** One command, an array of bulk strings, from the start of `buffer` */
function parseCommand(
  buffer: Buffer,
): { command: string[]; length: number } | undefined {
  const text = buffer.toString('latin1');
  if (!text.startsWith('*')) return;
  let at = text.indexOf('\r\n');
  if (at < 0) return;
  const count = Number(text.slice(1, at));
  at += 2;
  const command: string[] = [];
  for (let i = 0; i < count; i++) {
    const lineEnd = text.indexOf('\r\n', at);
    if (lineEnd < 0) return;
    const size = Number(text.slice(at + 1, lineEnd));
    const start = lineEnd + 2;
    if (text.length < start + size + 2) return;
    command.push(text.slice(start, start + size));
    at = start + size + 2;
  }
  return { command, length: at };
}
