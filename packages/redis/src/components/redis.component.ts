import { IoClientBaseComponent } from '@syncbridge/builtins';
import {
  Component,
  ComponentBase,
  LogChannel,
  UseDashboard,
} from '@syncbridge/common';
import * as ioredis from 'ioredis';
import { CommonRedisVariables } from './common-redis.variables.js';
import { RedisDashboard } from './redis.dashboard.js';

@Component({
  displayName: 'Redis Client',
  description: 'Redis client component',
  summary:
    'Abstract base of the Redis components: the settings, events and communication log they share.',
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

  /** Its connection: shown where an app includes it */
  @UseDashboard({ title: 'Redis' })
  declare readonly connection: RedisDashboard;

  protected _reconnects!: number;

  protected async _init(): Promise<void> {
    await super._init();
    this._reconnects = 0;
    this.connection?.link.set('unknown', 'Not connected');
    this.connection?.reconnects.set(0);
    const note = (event: string, message: string) =>
      this.communicationLog?.write({ direction: 'info', event, message });
    this.on('connect', () => {
      note('connect', 'Connected');
      this.connection?.link.set('ok', 'Connected');
    });
    this.on('disconnect', error => {
      const message = error ? `Disconnected: ${error.message}` : 'Disconnected';
      note('disconnect', message);
      this.connection?.link.set(error ? 'error' : 'warning', message);
    });
    this.on('reconnecting', () => {
      note('reconnecting', 'Connecting again');
      this.connection?.link.set('warning', 'Connecting again');
      this.connection?.reconnects.set(++this._reconnects);
    });
  }

  get client(): ioredis.Redis | ioredis.Cluster {
    throw new Error('Not implemented');
  }
}

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
