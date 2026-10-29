import net from 'node:net';

/**
 * A SOCKS5 proxy just enough for the tests: CONNECT to an IPv4 address or a
 * name, with no authentication or with a user name and password. It keeps
 * who logged in and where each tunnel went, for the test to read.
 */
export class Socks5Server {
  readonly server: net.Server;
  readonly logins: { username: string; password: string }[] = [];
  readonly tunnels: string[] = [];
  protected _sockets = new Set<net.Socket>();

  constructor(protected _credentials?: { username: string; password: string }) {
    this.server = net.createServer(socket => this._accept(socket));
  }

  get port(): number {
    return (this.server.address() as net.AddressInfo).port;
  }

  async listen(): Promise<this> {
    await new Promise<void>(resolve =>
      this.server.listen(0, '127.0.0.1', () => resolve()),
    );
    return this;
  }

  async close(): Promise<void> {
    this._sockets.forEach(s => s.destroy());
    await new Promise(resolve => this.server.close(resolve));
  }

  protected _accept(socket: net.Socket) {
    this._sockets.add(socket);
    socket.on('close', () => this._sockets.delete(socket));
    socket.on('error', () => undefined);
    let buffer = Buffer.alloc(0);
    let stage: 'greeting' | 'auth' | 'request' = 'greeting';
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (stage === 'greeting') {
        if (buffer.length < 2 || buffer.length < 2 + buffer[1]) return;
        const methods = buffer.subarray(2, 2 + buffer[1]);
        buffer = buffer.subarray(2 + buffer[1]);
        const method = this._credentials ? 0x02 : 0x00;
        if (!methods.includes(method)) {
          socket.end(Buffer.from([0x05, 0xff]));
          return;
        }
        socket.write(Buffer.from([0x05, method]));
        stage = this._credentials ? 'auth' : 'request';
      }
      if (stage === 'auth') {
        if (buffer.length < 2) return;
        const ulen = buffer[1];
        if (buffer.length < 3 + ulen) return;
        const plen = buffer[2 + ulen];
        if (buffer.length < 3 + ulen + plen) return;
        const username = buffer.subarray(2, 2 + ulen).toString();
        const password = buffer.subarray(3 + ulen, 3 + ulen + plen).toString();
        buffer = buffer.subarray(3 + ulen + plen);
        this.logins.push({ username, password });
        const ok =
          username === this._credentials!.username &&
          password === this._credentials!.password;
        socket.write(Buffer.from([0x01, ok ? 0x00 : 0x01]));
        if (!ok) return void socket.end();
        stage = 'request';
      }
      if (stage === 'request') {
        if (buffer.length < 5) return;
        let host: string;
        let offset: number;
        if (buffer[3] === 0x01) {
          if (buffer.length < 10) return;
          host = Array.from(buffer.subarray(4, 8)).join('.');
          offset = 8;
        } else if (buffer[3] === 0x03) {
          if (buffer.length < 7 + buffer[4]) return;
          host = buffer.subarray(5, 5 + buffer[4]).toString();
          offset = 5 + buffer[4];
        } else return void socket.destroy();
        const port = buffer.readUInt16BE(offset);
        const rest = buffer.subarray(offset + 2);
        socket.off('data', onData);
        this._connect(socket, host, port, rest);
      }
    };
    socket.on('data', onData);
  }

  protected _connect(
    socket: net.Socket,
    host: string,
    port: number,
    rest: Buffer,
  ) {
    const target = net.connect(port, host, () => {
      this.tunnels.push(`${host}:${port}`);
      socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      if (rest.length) target.write(rest);
      socket.pipe(target).pipe(socket);
    });
    this._sockets.add(target);
    target.on('close', () => {
      this._sockets.delete(target);
      socket.destroy();
    });
    target.on('error', () =>
      socket.end(Buffer.from([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0])),
    );
    socket.on('close', () => target.destroy());
  }
}
