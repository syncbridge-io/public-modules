import { Buffer } from 'node:buffer';
import net from 'node:net';
import { IoClientBaseComponent } from '@syncbridge/builtins';
import { Component, ServiceStatus } from '@syncbridge/common';
import colors from 'ansi-colors';
import { TcpClient } from '../classes/tcp-client.js';
import {
  TcpClientReconnectVariables,
  TcpClientTlsVariables,
  TcpClientVariables,
} from './tcp-client.variables.js';

/**
 * TcpClient component
 */
@Component({
  className: 'TcpClient',
  displayName: 'TCP Client',
  description: 'TCP client component',
  summary:
    'Connects to a TCP server, with TLS, SOCKS proxies and automatic reconnection, and reads and writes its bytes.',
  tags: ['tcp', 'client', 'socket', 'connection'],
})
export class TcpClientComponent<
  TEvents extends TcpClientComponent.Events = TcpClientComponent.Events,
> extends IoClientBaseComponent<TEvents> {
  readonly protocol: string = 'tcp';
  declare protected _client: TcpClient;
  protected _stopping?: boolean;
  protected _address?: any;

  @Component.UseVariables()
  declare values: TcpClientVariables;

  get connected(): boolean {
    return this._client.connected;
  }

  get peerAddress(): string | undefined {
    return `${this.values.host || '127.0.0.1'}:${this.values.port || 0}`;
  }

  protected async _init(): Promise<void> {
    await super._init();
    this.on('values-updated', () =>
      this._restart().catch(err =>
        this.setStatus(ServiceStatus.unhealthy, err.message),
      ),
    );
    this._createClient();
  }

  /** A client of the current values, for the next start */
  protected _createClient() {
    this._client = new TcpClient({
      host: this.values.host || '127.0.0.1',
      port: this.values.port || 0,
      localAddress: this.values.bindInterface,
      connectTimeout: this.values.connectTimeout,
      keepAlive: this.values.keepAlive,
      reconnect: this.values.reconnect,
      tls: this.values.tls_enabled ? this.values.tls : undefined,
      proxy: this.values.proxy_enabled
        ? {
            ...this.values.proxy,
            userId: this.values.proxy.username,
            type: this.values.proxy.proxyType === 'v4' ? 4 : 5,
          }
        : undefined,
    });

    /* On connection */
    this._client.on('connect', (socket: net.Socket) => {
      this._address = {
        address: this.values.host || '127.0.0.1',
        port: socket.remotePort,
      };
      this._address.toString = function (this: any): string {
        return `${this.address}:${this.port}`;
      }.bind(this._address);
      setImmediate(() => {
        this.logger?.info(
          `TCP socket connected to ${colors.cyan(this._client.host + ':' + this._client.port)}`,
        );
        this.setStatus(ServiceStatus.started);
        this.emit('connect');
      });
    });

    /* On disconnect */
    this._client.on('disconnect', (err?: Error) => {
      if (this._stopping) this.emit('disconnect');
      else {
        err = err || new Error('TCP socket disconnected');
        this.logger?.error(err);
        this.setStatus(ServiceStatus.unhealthy, err.message);
        this.emit('disconnect', err);
      }
    });

    /* On data */
    this._client.on('data', (chunk: Buffer) => {
      this.emit('data', chunk, this._address);
    });

    /* On error */
    this._client.on('error', (err: Error) => {
      this.emit('error', err);
    });

    /* On reconnecting */
    this._client.on('reconnecting', (n: number, delay: number) => {
      this.logger?.error(
        `Connection failed (${colors.cyan(String(n + 1))}). Trying again after ${colors.cyan(delay + 'ms')}`,
      );
      this.emit('reconnecting', n, delay);
    });
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    this._stopping = false;
    this._createClient();
    this.logger?.info(
      `TCP socket connecting to ${colors.cyan(this._client.host + ':' + this._client.port)}`,
    );
    this._client.connect();
    if (!this._client.connected) this.setStatus(ServiceStatus.unhealthy);
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await this._client.disconnect();
  }

  write(data: string | Buffer): void {
    if (!this.connected) {
      throw new Error(`Can't write while TCP socket is not connected`);
    }
    this.emit('transmit', data, this._address);
    this._client!.write(data);
  }
}

/**
 * @namespace
 */
export namespace TcpClientComponent {
  export interface Events extends IoClientBaseComponent.Events {
    connect: [];
    disconnect: [error: Error | undefined];
    reconnecting: [n: number, delay: number];
  }

  export const Variables = TcpClientVariables;
  export type Variables = TcpClientVariables;
  export const ReconnectVariables = TcpClientReconnectVariables;
  export type ReconnectVariables = TcpClientReconnectVariables;
  export const TlsVariables = TcpClientTlsVariables;
  export type TlsVariables = TcpClientTlsVariables;
}
