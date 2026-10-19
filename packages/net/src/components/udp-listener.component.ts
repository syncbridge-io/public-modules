import { Buffer } from 'node:buffer';
import dgram from 'node:dgram';
import { IoClientBaseComponent } from '@syncbridge/builtins';
import { Component, ServiceStatus } from '@syncbridge/common';
import { UdpListenerVariables } from './udp-listener.variables.js';

/**
 * UdpClient component
 */
@Component({
  className: 'UdpListener',
  displayName: 'UDP Listener',
  description: 'UDP listener component',
  tags: ['udp', 'server', 'connection'],
})
export class UdpListenerComponent<
  TEvents extends UdpListenerComponent.Events = UdpListenerComponent.Events,
> extends IoClientBaseComponent<TEvents> {
  readonly protocol: string = 'udp';
  declare socket: dgram.Socket & { readonly isBroadcastEnabled: boolean };
  protected _stopping?: boolean;

  @Component.UseVariables()
  declare values: UdpListenerVariables;

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
    this.socket.on('listening', () => {
      const { bindInterface, multicastInterface } = this.values;
      if (this.values.broadcast) {
        this.logger?.debug(`Broadcast mode enabled`);
        this.socket.setBroadcast(true);
      }
      if (this.values.multicastGroups)
        this.values.multicastGroups.forEach(group => {
          this.logger?.debug(`Joining multicast group ${group}`);
          this.socket.addMembership(group, multicastInterface);
        });
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
      // todo logger
      // this.logger.debug(
      //   `Data received from ${colors.cyan(info.address + ':' + info.port)} (${msg.length} bytes)`,
      //   {
      //     host: info.address,
      //     port: info.port,
      //     size: msg.length,
      //   },
      // );
      const info2 = {
        ...info,
        toString() {
          return `${this.address}:${this.port}`;
        },
      };
      this.emit('data', msg, info2);
    });
    this.socket.bind(this.values.port, this.values.bindInterface || '0.0.0.0');
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await new Promise<void>(resolve => {
      this.socket.close(resolve);
      this._stopping = false;
    });
  }

  write(data: string | Buffer, port?: number, host?: string): void {
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
export namespace UdpListenerComponent {
  export interface Events extends IoClientBaseComponent.Events {
    data: [data: Buffer, info: dgram.RemoteInfo];
    write: [data: Buffer | string];
  }

  export const Variables = UdpListenerVariables;
  export type Variables = UdpListenerVariables;
}
