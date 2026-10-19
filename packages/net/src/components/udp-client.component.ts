import { Buffer } from 'node:buffer';
import dgram from 'node:dgram';
import { IoClientBaseComponent } from '@syncbridge/builtins';
import { Component, ServiceStatus } from '@syncbridge/common';
import { UdpClientVariables } from './udp-client.variables.js';

/**
 * UdpClient component
 */
@Component({
  className: 'UdpClient',
  displayName: 'UDP Client',
  description: 'UDP client component',
  tags: ['udp', 'client', 'socket', 'connection'],
})
export class UdpClientComponent<
  TEvents extends UdpClientComponent.Events = UdpClientComponent.Events,
> extends IoClientBaseComponent<TEvents> {
  readonly protocol: string = 'udp';
  declare socket: dgram.Socket & { readonly isBroadcastEnabled: boolean };
  protected _stopping?: boolean;

  @Component.UseVariables()
  declare values: UdpClientVariables;

  /** Of a client that connects: one only binds to a port to send */
  get peerAddress(): string | undefined {
    return this.values.port
      ? `${this.values.host || '127.0.0.1'}:${this.values.port}`
      : undefined;
  }

  protected async _init(): Promise<void> {
    await super._init();
    this.on('values-updated', async () => {
      const isStopped = this.stopped;
      await this._stop();
      if (!isStopped) {
        await this._start(new AbortController().signal).catch(err => {
          this.setStatus(ServiceStatus.unhealthy, err.message);
        });
      }
    });
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    this._stopping = false;
    this.socket = dgram.createSocket('udp4') as any;
    let isBroadcastEnabled = false;
    Object.defineProperty(this.socket, 'isBroadcastEnabled', {
      get(): any {
        return isBroadcastEnabled;
      },
    });
    const oldSetBroadcast = this.socket.setBroadcast;
    this.socket.setBroadcast = (value: boolean) => {
      isBroadcastEnabled = value;
      oldSetBroadcast.call(this.socket, value);
    };
    this.socket.on('connect', () => {
      this.emit('connect');
      this.setStatus(ServiceStatus.started);
    });
    this.socket.on('listening', () => {
      const { bindInterface } = this.values;
      const port = this.socket.address().port;
      this.emit('listening', port);
      this.logger?.info(
        `UDP socket listening on port ${port}` +
          (bindInterface ? ` interface ${bindInterface}` : ''),
      );
      this.setStatus(ServiceStatus.started);
    });
    this.socket.on('message', (msg, info) => {
      if (info.address === '127.0.0.1') return;
      const info2 = {
        ...info,
        toString() {
          return `${this.address}:${this.port}`;
        },
      };
      this.emit('data', msg, info2);
    });
    if (this.values.bindInterface) {
      this.socket.bind(this.values.port || 0, this.values.bindInterface);
    }
    if (this.values.port) {
      this.socket.connect(this.values.port, this.values.host);
    } else this.setStatus(ServiceStatus.started);
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await new Promise<void>(resolve => {
      this.socket.close(resolve);
      this._stopping = false;
    });
  }

  write(data: string | Buffer, port?: number, host?: string): void {
    host = host || this.values.host;
    port = port || this.values.port;
    if (!host)
      throw new Error(
        'You must provide "host" variable to send message over UDP socket',
      );
    this.socket!.send(data, port, host);
    const info2 = {
      address: host,
      port: port,
      size: data.length,
      toString() {
        return `${this.address}:${this.port}`;
      },
    };
    this.emit('transmit', data, info2);
    // todo logger
    // if (this.socket.isBroadcastEnabled)
    //   this.logger.debug(
    //     `Broadcast message sent ${colors.cyan(host + ':' + port)} (${data.length} bytes)`,
    //   );
    // else
    //   this.logger.debug(
    //     `Message sent to ${colors.cyan(host + ':' + port)} (${data.length} bytes)`,
    //   );
  }
}

/**
 * @namespace
 */
export namespace UdpClientComponent {
  export interface Events extends IoClientBaseComponent.Events {
    data: [data: Buffer, info: dgram.RemoteInfo];
    write: [data: Buffer | string];
  }

  export const Variables = UdpClientVariables;
  export type Variables = UdpClientVariables;
}
