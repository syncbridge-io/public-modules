import { Buffer } from 'node:buffer';
import { Component, ComponentBase, LogChannel } from '@syncbridge/common';
import { peerOf } from '../utils/peer-of.js';
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

  @Component.UseVariables()
  declare values: IoClientComponentVariables;

  protected async _init(): Promise<void> {
    await super._init();
    /* A component made outside an app factory has no channels */
    this.on('data', (data, peer) => {
      this.communicationLog?.write({
        direction: 'in',
        data,
        details: peerOf(peer),
      });
    });
    this.on('transmit', (data, peer) => {
      this.communicationLog?.write({
        direction: 'out',
        data,
        details: peerOf(peer),
      });
    });
    this.on('connect', () =>
      this.communicationLog?.write({
        direction: 'info',
        event: 'connect',
        message: 'Connected',
        details: this.peerAddress,
      }),
    );
    this.on('disconnect', error =>
      this.communicationLog?.write({
        direction: 'info',
        event: 'disconnect',
        message: error ? `Disconnected: ${error.message}` : 'Disconnected',
        details: this.peerAddress,
      }),
    );
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
