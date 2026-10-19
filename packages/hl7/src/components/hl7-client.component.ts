import { Buffer } from 'node:buffer';
import type { AddressInfo } from 'node:net';
import { peerOf } from '@syncbridge/builtins';
import {
  Component,
  ComponentBase,
  LogChannel,
  ServiceStatus,
} from '@syncbridge/common';
import colors from 'ansi-colors';
import { HL7Message } from 'hl7v2';
import { Hl7Client, type HL7Middleware, type HL7ResponseHook } from 'hl7v2-net';
import { noOp } from '../constants.js';
import { HL7ClientVariables } from './hl7-client.variables.js';
import { hl7ProtocolOptions } from './hl7-protocol.variables.js';

/**
 * HL7Client component
 */
@Component({
  className: 'HL7Client',
  displayName: 'HL7 Client',
  description: 'HL7 Client component',
  tags: ['hl7', 'client'],
})
export class HL7ClientComponent<
  TEvents extends HL7ClientComponent.Events = HL7ClientComponent.Events,
> extends ComponentBase<TEvents> {
  protected _stopping?: boolean;
  protected _address?: any;
  /**
   * Handlers added with use(), kept by the component: the client is created
   * again whenever the values change, and each new one gets them all
   */
  protected readonly _middlewares: {
    handler: HL7Middleware;
    priority?: number;
  }[] = [];
  /** beforeResponse() hooks, kept for the same reason */
  protected readonly _responseHooks: HL7ResponseHook[] = [];
  declare client: Hl7Client;

  /** What the component receives and transmits */
  @LogChannel({
    name: 'communication',
    title: 'Communication',
    description: 'What the component receives and transmits',
    kind: 'transmit',
    retentionDays: 14,
    /* Off unless turned on: traffic grows the logs fast, and the devices
     * on the other side often keep it themselves */
    enabled: false,
    events: ['connect', 'disconnect', 'read', 'write'],
  })
  declare readonly communicationLog: LogChannel;

  @Component.UseVariables()
  declare values: HL7ClientVariables;

  protected async _init(): Promise<void> {
    await super._init();
    this.values.reconnect = this.values.reconnect || {};
    this.on('data', (data, info) => {
      this.communicationLog?.write({
        direction: 'in',
        data,
        details: peerOf(info),
      });
    });
    this.on('transmit', (data, info) => {
      this.communicationLog?.write({
        direction: 'out',
        data,
        details: peerOf(info),
      });
    });
    this.on('values-updated', () => this._configureClient());
    await this._configureClient();
  }

  protected async _configureClient() {
    try {
      const isStopped = this.stopped;
      if (!isStopped) await this._stop();
      if (this.client) await this.client.close();
      if (this.values.tls) {
        this.client = Hl7Client.createTlsClient({
          host: this.values.host,
          port: this.values.port,
          connectTimeout: this.values.connectTimeout,
          responseTimeout: this.values.responseTimeout,
          keepAlive: this.values.keepAlive,
          reconnect: this.values.reconnect,
          ...hl7ProtocolOptions(this.values),
          ...this.values.tls,
        });
      } else {
        this.client = Hl7Client.createClient({
          host: this.values.host,
          port: this.values.port,
          localAddress: this.values.bindInterface,
          connectTimeout: this.values.connectTimeout,
          responseTimeout: this.values.responseTimeout,
          keepAlive: this.values.keepAlive,
          ...hl7ProtocolOptions(this.values),
          reconnect: {
            // @ts-ignore
            strategy: 'exponential',
            ...this.values.reconnect,
          },
        });
      }
      for (const m of this._middlewares) this.client.use(m.handler, m.priority);
      for (const hook of this._responseHooks) this.client.beforeResponse(hook);
      this.client.on('connect', () => {
        this._address = {
          address: this.values.host || '127.0.0.1',
          port: this.client.remotePort,
        };
        this._address.toString = function (this: any): string {
          return `${this.address}:${this.port}`;
        }.bind(this._address);
        this.communicationLog?.write({
          direction: 'info',
          event: 'connect',
          message: 'Connected',
          details: peerOf(this._address),
        });
        this.logger?.trace(`Connected to ${colors.blueBright(this._address)}`);
        /* Unhealthy while it was connecting (_start); healthy once connected */
        this.setStatus(ServiceStatus.started);
        this.emit('connect', this._address);
      });
      this.client.on('ready', () => this.emit('ready', this._address));
      this.client.on('close', () => {
        this.communicationLog?.write({
          direction: 'info',
          event: 'disconnect',
          message: 'Disconnected',
          details: peerOf(this._address),
        });
        this.logger?.trace(
          `Disconnected from ${colors.blueBright(this._address)}`,
        );
        this.emit('close', this._address);
      });
      /* A connection lost while running: unhealthy until it reconnects */
      this.client.on('disconnect', (err?: Error) => {
        if (this._stopping) return;
        this.setStatus(
          ServiceStatus.unhealthy,
          err?.message || `Disconnected from ${this._address}`,
        );
      });
      this.client.on('error', error => {
        error = error instanceof AggregateError ? error.errors[0] : error;
        if (error.code === 'ECONNREFUSED')
          error.message = `Connection refused to ${error.address}:${error.port}`;
        this.logger?.error(error);
        this.emit('error', error, this._address);
      });
      this.client.on('message', message => {
        this.logger?.trace(
          `HL7 message (${message.messageType}) received from ${this.client.uri}`,
        );
        this.emit('message', message, this._address);
      });
      this.client.on('send', message => {
        this.logger?.trace(
          `HL7 message (${message.messageType}) sent to ${this.client.uri}`,
        );
        this.emit('send', message, this._address);
      });
      this.client.on('data', data => {
        this.emit('data', data, this._address);
      });
      if (!isStopped) {
        await this._start(new AbortController().signal);
      }
    } catch (err: any) {
      this.logger?.error(err);
      this.setStatus(ServiceStatus.unhealthy, err.message);
    }
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    this._stopping = false;
    this.client.connect().catch(noOp);
    if (!this.client.connected) this.setStatus(ServiceStatus.unhealthy);
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await this.client?.close(30000);
    return super._stop();
  }

  /**
   * Adds a handler for received messages. It stays when the client is
   * created again for new values.
   */
  use(handler: HL7Middleware, priority?: number): void {
    this._middlewares.push({ handler, priority });
    this.client?.use(handler, priority);
  }

  /**
   * Adds a hook that sees every answer to a received message before it is
   * sent, and may change it, replace it (return another message) or drop
   * it (return null) - for a device that expects other acknowledgments
   * than the standard ones. It stays when the client is created again for
   * new values. See hl7v2-net's beforeResponse.
   */
  beforeResponse(hook: HL7ResponseHook): void {
    this._responseHooks.push(hook);
    this.client?.beforeResponse(hook);
  }
}

/**
 * @namespace
 */
export namespace HL7ClientComponent {
  export interface Events extends ComponentBase.Events {
    connect: [info: AddressInfo];
    ready: [info: AddressInfo];
    close: [info: AddressInfo];
    error: [error: Error, info: AddressInfo];
    message: [message: HL7Message, info: AddressInfo];
    data: [data: Buffer, info: AddressInfo];
    transmit: [data: Buffer, info: AddressInfo];
  }

  export const Variables = HL7ClientVariables;
  export type Variables = HL7ClientVariables;
}
