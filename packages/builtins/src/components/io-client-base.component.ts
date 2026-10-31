import { Buffer } from 'node:buffer';
import {
  Component,
  ComponentBase,
  LogChannel,
  UseDashboard,
} from '@syncbridge/common';
import { peerOf } from '../utils/peer-of.js';
import { IoClientDashboard } from './io-client-base.dashboard.js';
import { IoClientComponentVariables } from './io-client-base.variables.js';

/**
 *
 */
@Component({
  abstract: true,
  className: 'IoClient',
  displayName: 'IO Client',
  description: 'Abstract component for IO operations',
  summary:
    'Abstract base of the components that connect to one peer: it defines their data events, write() and communication log.',
  tags: ['io', 'stream'],
})
export class IoClientBaseComponent<
  TEvents extends IoClientBaseComponent.Events = IoClientBaseComponent.Events,
> extends ComponentBase<TEvents> {
  readonly protocol: string = '';

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

  /** Its link and the bytes it moved, a tab of the worker's page */
  @UseDashboard({ title: 'Connection' })
  declare readonly connection: IoClientDashboard;

  @Component.UseVariables()
  declare values: IoClientComponentVariables;

  /* Totals since the worker started: a dashboard keeps nothing over a restart */
  protected _received!: number;
  protected _sent!: number;

  protected async _init(): Promise<void> {
    await super._init();
    this._received = 0;
    this._sent = 0;
    /* A component made outside an app factory has no channels nor dashboards */
    this.connection?.link.set('unknown', 'Not connected');
    this.connection?.received.set(0);
    this.connection?.sent.set(0);
    this.on('data', (data, peer) => {
      this.communicationLog?.write({
        direction: 'in',
        data,
        details: peerOf(peer),
      });
      /* A value set many times is sent as its last, once a second */
      this._received += Buffer.byteLength(data);
      this.connection?.received.set(this._received);
    });
    this.on('transmit', (data, peer) => {
      this.communicationLog?.write({
        direction: 'out',
        data,
        details: peerOf(peer),
      });
      this._sent += Buffer.byteLength(data);
      this.connection?.sent.set(this._sent);
    });
    this.on('connect', () => {
      this.communicationLog?.write({
        direction: 'info',
        event: 'connect',
        message: 'Connected',
        details: this.peerAddress,
      });
      this.connection?.link.set(
        'ok',
        this.peerAddress ? `Connected to ${this.peerAddress}` : 'Connected',
      );
    });
    this.on('disconnect', error => {
      const message = error ? `Disconnected: ${error.message}` : 'Disconnected';
      this.communicationLog?.write({
        direction: 'info',
        event: 'disconnect',
        message,
        details: this.peerAddress,
      });
      this.connection?.link.set(error ? 'error' : 'warning', message);
    });
  }

  /**
   * What the component connects to, as its connection's records tell it:
   * `host:port`, a serial port's path, a tunnel's address. A component
   * gives its own; none by default.
   */
  get peerAddress(): string | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  write(data: string | Buffer): void {
    throw new Error(
      `"${this.constructor.name}" component do not support write operations.`,
    );
  }
}

/**
 * @namespace
 */
export namespace IoClientBaseComponent {
  export interface Events extends ComponentBase.Events {
    data: [data: Buffer, ...any];
    transmit: [data: Buffer, ...any];
    /** Written to the communication channel, as are disconnects */
    connect: [];
    disconnect: [error?: Error];
  }
  export const Variables = IoClientComponentVariables;
  export type Variables = IoClientComponentVariables;
}
