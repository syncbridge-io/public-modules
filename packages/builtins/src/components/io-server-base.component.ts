import { Buffer } from 'node:buffer';
import { Component, ComponentBase, LogChannel } from '@syncbridge/common';
import { peerOf } from '../utils/peer-of.js';
import { IoServerComponentVariables } from './io-server-base.variables.js';

/**
 *
 */
@Component({
  abstract: true,
  className: 'IoServer',
  displayName: 'IO Server',
  description: 'Abstract component for IO operations',
  tags: ['io', 'stream'],
})
export class IoServerBaseComponent<
  TEvents extends IoServerBaseComponent.Events = IoServerBaseComponent.Events,
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
  declare values: IoServerComponentVariables;

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
export namespace IoServerBaseComponent {
  export interface Events extends ComponentBase.Events {
    data: [data: Buffer, ...any];
    transmit: [data: Buffer, ...any];
  }
  export const Variables = IoServerComponentVariables;
  export type Variables = IoServerComponentVariables;
}
