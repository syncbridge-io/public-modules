import { IoClientBaseComponent } from '@syncbridge/builtins';
import { Component, ComponentBase, LogChannel } from '@syncbridge/common';
import * as ioredis from 'ioredis';
import { CommonRedisVariables } from './common-redis.variables.js';

@Component({
  displayName: 'Redis Client',
  description: 'Redis client component',
  tags: ['redis', 'client'],
  abstract: true,
})
export class RedisComponent<
  TEvents extends RedisComponent.Events = RedisComponent.Events,
> extends ComponentBase<TEvents> {
  @Component.UseVariables()
  declare values: CommonRedisVariables;

  /** Its connection to Redis: connected, lost, connecting again */
  @LogChannel({
    name: 'communication',
    title: 'Communication',
    description: 'Its connection to Redis',
    kind: 'transmit',
    retentionDays: 14,
    /* Off unless turned on, as every component's communication */
    enabled: false,
    events: ['connect', 'disconnect', 'reconnecting'],
  })
  declare readonly communicationLog: LogChannel;

  protected async _init(): Promise<void> {
    await super._init();
    const note = (event: string, message: string) =>
      this.communicationLog?.write({ direction: 'info', event, message });
    this.on('connect', () => note('connect', 'Connected'));
    this.on('disconnect', error =>
      note(
        'disconnect',
        error ? `Disconnected: ${error.message}` : 'Disconnected',
      ),
    );
    this.on('reconnecting', () => note('reconnecting', 'Connecting again'));
  }

  get client(): ioredis.Redis | ioredis.Cluster {
    throw new Error('Not implemented');
  }
}

/**
 /**
 * @namespace
 */
export namespace RedisComponent {
  export interface Events extends IoClientBaseComponent.Events {
    connect: [];
    disconnect: [error: Error | undefined];
    reconnecting: [];
  }

  export const Variables = CommonRedisVariables;
  export type Variables = CommonRedisVariables;
}
