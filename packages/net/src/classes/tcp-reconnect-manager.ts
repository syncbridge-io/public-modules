import net from 'node:net';
import { Backoff, exponential, fibonacci } from 'backoff';
import { AsyncEventEmitter } from 'node-events-async';
import { TcpClient } from './tcp-client.js';

export class TcpReconnectManager extends AsyncEventEmitter {
  private _backoff: Backoff;
  private _socket?: net.Socket;
  private _connecting = false;
  private _args?: TcpClient.Options;
  reconnect = true;

  constructor(
    private readonly _factory: (args: TcpClient.Options) => Promise<net.Socket>,
    options: TcpClient.ReconnectOptions,
  ) {
    super();
    this._backoff =
      options.strategy instanceof Backoff
        ? options.strategy
        : options.strategy === 'exponential'
          ? exponential({
              initialDelay: options.initialDelay ?? 2000,
              maxDelay: options.maxDelay ?? 10000,
              randomisationFactor: options.randomisationFactor ?? 0,
            })
          : fibonacci({
              initialDelay: options.initialDelay ?? 2000,
              maxDelay: options.maxDelay ?? 10000,
              randomisationFactor: options.randomisationFactor ?? 0,
            });

    if (options.failAfter != null) this._backoff.failAfter(options.failAfter);

    this._backoff.on('ready', (n, delay) => {
      this.emit('reconnect', n, delay);
      void this._doConnect();
    });

    this._backoff.on('fail', () => {
      this.emit('fail');
    });
  }

  get connected(): boolean {
    return !!this._socket && !this._socket.destroyed;
  }

  connect(args: TcpClient.Options) {
    this._args = args;
    void this._doConnect();
  }

  disconnect() {
    this.reconnect = false;
    this._backoff.reset();
    this._socket?.destroy();
    this._socket = undefined;
  }

  reset() {
    this._backoff.reset();
  }

  private async _doConnect() {
    if (this._connecting || !this._args) return;
    this._connecting = true;
    try {
      const socket = await this._factory(this._args);
      this._socket = socket;
      this._connecting = false;
      this._backoff.reset();

      socket.once('close', err => {
        this._socket = undefined;
        this.emit('disconnect', err || undefined);
        if (this.reconnect) this._backoff.backoff();
      });

      socket.on('error', err => {
        this.emit('error', err);
      });

      this.emit('connect', socket);
    } catch (err) {
      this._connecting = false;
      this.emit('error', err);
      if (this.reconnect) this._backoff.backoff();
    }
  }
}
