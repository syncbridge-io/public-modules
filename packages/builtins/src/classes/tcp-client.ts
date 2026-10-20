import net from 'node:net';
import tls from 'node:tls';
import type { Backoff } from 'backoff';
import { AsyncEventEmitter, type EventMap } from 'node-events-async';
import socks from 'socks';
import type { RequiredSome } from 'ts-gems';
import { TcpReconnectManager } from './tcp-reconnect-manager.js';

export class TcpClient<
  T extends TcpClient.Events = TcpClient.Events,
> extends AsyncEventEmitter<EventMap<T>> {
  protected _connectionManager?: TcpReconnectManager;
  protected _socket?: net.Socket;
  protected _options: RequiredSome<TcpClient.Options, 'reconnect'>;

  constructor(options: TcpClient.Options) {
    super();
    this._options = {
      ...options,
      reconnect: options.reconnect || {},
    };
    this._options.host = this._options.host || 'localhost';
    this._options.port = this._options.port || 0;
    this.reconnect.initialDelay = this.reconnect.initialDelay ?? 2000;
    this.reconnect.maxDelay = this.reconnect.maxDelay ?? 10000;
    this.reconnect.strategy = this.reconnect.strategy ?? 'fibonacci';
  }

  get connected(): boolean {
    return !!this._connectionManager?.connected;
  }

  get socket(): net.Socket | undefined {
    return this._socket;
  }

  get host(): string {
    return this._options.host;
  }

  get port(): number {
    return this._options.port;
  }

  get reconnect(): TcpClient.ReconnectOptions {
    return this._options.reconnect;
  }

  connect() {
    if (this.connected) return;
    let reconnecting = false;
    const connectionManager = (this._connectionManager =
      new TcpReconnectManager(createSocket, this.reconnect));

    connectionManager
      .on('error', (error: any) => {
        if (!connectionManager.reconnect) return;
        error = error instanceof AggregateError ? error.errors[0] : error;
        if (error.code === 'ECONNREFUSED')
          error.message = `Connection refused to ${error.address}:${error.port}`;
        this.emit('error', error);
      })
      .on('connect', (socket: net.Socket) => {
        if (this._socket !== socket) {
          this._socket = socket;
          socket.on('data', (chunk: Buffer) => this.emit('data', chunk));
        }
        if (reconnecting) this.emit('reconnect', socket);
        reconnecting = false;
        this.emit('connect', socket);
      })
      .on('reconnect', (n, delay) => {
        if (n === 0 && delay === 0) return;
        reconnecting = true;
        this.emit('reconnecting', n, delay);
      })
      .on('disconnect', err => {
        this._socket = undefined;
        if (connectionManager.reconnect) {
          if (err) err.message = `TCP socket connection lost: ${err.message}`;
          else err = new Error('TCP socket connection lost');
          this.emit('disconnect', err);
        } else this.emit('disconnect');
      });

    connectionManager.connect(this._options);
  }

  async disconnect() {
    if (!this._connectionManager) return;
    const connectionManager = this._connectionManager;
    this._connectionManager = undefined;
    /** istanbul ignore else */
    if (connectionManager.connected) {
      connectionManager.reconnect = false;
      return new Promise<void>(resolve => {
        connectionManager.once('disconnect', async () => {
          connectionManager.reset();
          resolve();
        });
        connectionManager.disconnect();
      });
    } else {
      connectionManager.disconnect();
      connectionManager.reset();
    }
  }

  write(data: string | Buffer) {
    if (!this._socket)
      throw new Error(`Can't write while TCP socket is not connected`);
    this._socket.write(data);
  }
}

export namespace TcpClient {
  export interface Options {
    host: string;
    port: number;
    connectTimeout?: number;
    keepAlive?: boolean;
    reconnect?: ReconnectOptions;
    localAddress?: string;
    tls?: tls.SecureContextOptions;
    proxy?: socks.SocksProxy;
  }

  export interface ReconnectOptions {
    strategy?: 'fibonacci' | 'exponential' | Backoff;
    immediate?: boolean | undefined;
    failAfter?: number | undefined;
    randomisationFactor?: number | undefined;
    initialDelay?: number | undefined;
    maxDelay?: number | undefined;
  }

  export interface Events {
    connect: [socket: net.Socket];
    disconnect: [error: Error | undefined];
    reconnecting: [n: number, delay: number];
    reconnect: [socket: net.Socket];
    data: [data: Buffer];
    error: [error: Error];
  }
}

async function createSocket(args: TcpClient.Options): Promise<net.Socket> {
  let socket: net.Socket;
  if (args.proxy) {
    const info = await socks.SocksClient.createConnection({
      proxy: args.proxy,
      command: 'connect',
      destination: {
        host: args.host,
        port: args.port,
      },
      timeout: args.connectTimeout,
      socket_options: {
        localAddress: args.localAddress,
      } as net.SocketConnectOpts,
    });
    socket = info.socket;
  } else {
    socket = await new Promise<net.Socket>((resolve, reject) => {
      const s = net.connect({
        host: args.host,
        port: args.port,
        keepAlive: args.keepAlive,
        localAddress: args.localAddress,
        timeout: undefined,
      });
      let timeoutTimer: NodeJS.Timeout | undefined;
      const onConnect = () => {
        clearTimeout(timeoutTimer);
        s.removeListener('error', onError);
        resolve(s);
      };
      const onError = (err: Error) => {
        clearTimeout(timeoutTimer);
        s.removeListener('connect', onConnect);
        reject(err);
      };
      s.once('connect', onConnect);
      s.once('error', onError);
      if (args.connectTimeout) {
        timeoutTimer = setTimeout(() => {
          s.destroy(new Error('Connection timed out'));
        }, args.connectTimeout).unref();
      }
    });
  }

  if (args.tls) {
    const secureSocket = tls.connect({
      ...args.tls,
      socket,
      timeout: undefined,
    });
    // Connected is told once the handshake is done, not before
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        secureSocket.removeListener('secureConnect', onSecure);
        secureSocket.destroy();
        reject(err);
      };
      const onSecure = () => {
        secureSocket.removeListener('error', onError);
        resolve();
      };
      secureSocket.once('secureConnect', onSecure);
      secureSocket.once('error', onError);
    });
    return secureSocket;
  }

  return socket;
}
