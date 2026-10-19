import { Component, ServiceStatus } from '@syncbridge/common';
import * as ioredis from 'ioredis';
import { noOp } from '../constants.js';
import { RedisComponent } from './redis.component.js';
import { RedisStandaloneVariables } from './redis-standalone.variables.js';

@Component({
  displayName: 'Redis Standalone Client',
  description: 'Redis standalone client component',
  tags: ['standalone'],
})
export class RedisStandaloneComponent<
  TEvents extends RedisStandaloneComponent.Events =
    RedisStandaloneComponent.Events,
> extends RedisComponent<TEvents> {
  declare protected _client: ioredis.Redis;
  private _stopping?: boolean;

  @Component.UseVariables()
  declare values: RedisStandaloneVariables;

  get client(): ioredis.Redis {
    if (!this._client) throw new Error('Not initialized yet.');
    return this._client;
  }

  protected async _init(): Promise<void> {
    await super._init();
    this._client = new ioredis.Redis({
      ...this.values,
      lazyConnect: true,
    });
    this._client.on('close', (err?: Error) => {
      if (!this._stopping) {
        this.setStatus(
          ServiceStatus.unhealthy,
          err?.message ?? 'Connection closed unexpectedly',
        );
      }
      this.emitSafe('disconnect', err);
    });
    this._client.on('ready', () => {
      this.setStatus(ServiceStatus.started);
      this.emitSafe('connect');
    });
    this._client.on('reconnecting', () => {
      this.emitSafe('reconnecting');
    });
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    await new Promise<void>((resolve, reject) => {
      if (this._client.status === 'connect') return resolve();
      const onError = (err: any) => {
        this.setStatus(ServiceStatus.unhealthy, err.message);
        this._client.removeListener('ready', onReady);
        reject(err);
      };
      const onReady = () => {
        this._client.removeListener('error', onError);
        resolve();
      };
      this._client.once('error', onError);
      this._client.once('ready', onReady);
      if (this._client.status === 'close' || this._client.status === 'wait')
        this._client.connect();
    });
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    if (this._client.status === 'ready') {
      await this._client.quit().catch(noOp);
    } else if (
      this._client.status !== 'end' &&
      this._client.status !== 'close'
    ) {
      this._client.disconnect();
    }
  }
}

/**
 /**
 * @namespace
 */
export namespace RedisStandaloneComponent {
  export interface Events extends RedisComponent.Events {
    connect: [];
    disconnect: [error: Error | undefined];
    reconnecting: [];
  }

  export const Variables = RedisStandaloneVariables;
  export type Variables = RedisStandaloneVariables;
}
