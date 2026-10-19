import '@sqb/oracle';
import '@sqb/postgres';
import { clearTimeout } from 'node:timers';
import { SqbClient, SQBError } from '@sqb/connect';
import {
  Component,
  ComponentBase,
  LogChannel,
  ServiceStatus,
} from '@syncbridge/common';
import colors from 'ansi-colors';
import { noOp } from '../constants.js';
import {
  SqbClientPoolVariables,
  SqbClientVariables,
} from './sqb-client.variables.js';

/**
 * SqbClient component
 */
@Component({
  className: 'SqbClient',
  displayName: 'SqbClient',
  description: 'Database Connection Client',
  summary:
    'Connects to a PostgreSQL or Oracle database through SQB, with a connection pool and a log of the SQL it runs.',
  tags: ['io', 'stream'],
})
export class SqbClientComponent<
  TEvents extends SqbClientComponent.Events = SqbClientComponent.Events,
> extends ComponentBase<TEvents> {
  protected _livenessTimer?: NodeJS.Timeout;
  declare protected client: SqbClient;

  @Component.UseVariables()
  declare values: SqbClientVariables;

  /** The SQL it runs, with its parameters, and what fails */
  @LogChannel({
    name: 'queries',
    title: 'Queries',
    description: 'The SQL it runs, with its parameters, and what fails',
    retentionDays: 7,
    /* Off unless turned on: queries are many, and their parameters may
     * hold what should not be kept */
    enabled: false,
    events: ['execute', 'error'],
  })
  declare readonly queriesLog: LogChannel;

  protected async _init(): Promise<void> {
    await super._init();
    this._createClient();
    this.on('values-updated', () =>
      this._restart().catch(err =>
        this.setStatus(ServiceStatus.unhealthy, err.message),
      ),
    );
  }

  /** A client of the current values, for the next start; the old one is closed */
  protected _createClient() {
    const client = new SqbClient({
      dialect: this.values.dialect,
      host: this.values.host,
      port: this.values.port,
      user: this.values.username,
      password: this.values.password,
      database: this.values.database,
      schema: this.values.schema,
      name: this.values.applicationName,
      pool: this.values.pool,
    });
    this.client = client;
    client.on('error', (err: Error) => {
      if (err instanceof SQBError && this.logger?.level === 'debug') {
        const query = err.request?.sql || String(err.query);
        this.logger.debug(
          err.message +
            `\nSQL: ${colors.whiteBright(query)}\n${
              err.request?.params
                ? 'Params: \n   ' +
                  Object.entries(err.request.params)
                    .map(
                      ([key, value]) =>
                        `${colors.yellow(key)}: ${colors.yellowBright(String(value))}`,
                    )
                    .join(`\n   `)
                : ''
            }`,
          {
            query,
            dialect: err.request?.dialect,
            params: err.request?.params,
          },
        );
      }
    });
    client.on('execute', request =>
      this.queriesLog?.write({
        level: 'info',
        event: 'execute',
        message: request.sql,
        fields: request.params ? { params: request.params } : undefined,
      }),
    );
    client.on('error', (err: Error) =>
      this.queriesLog?.write({
        level: 'error',
        event: 'error',
        message:
          err instanceof SQBError && err.request?.sql
            ? `${err.message}\nSQL: ${err.request.sql}`
            : err.message,
        fields:
          err instanceof SQBError && err.request?.params
            ? { params: err.request.params }
            : undefined,
      }),
    );
    client.on('acquire', () => {
      this._resetLiveness();
    });
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    // The values are the client's: it is built again to take them
    await this.client?.close().catch(noOp);
    this._createClient();
    await this._testConnection(abortSignal);
  }

  protected async _stop(): Promise<void> {
    clearTimeout(this._livenessTimer);
    await this.client.close();
    return super._stop();
  }

  protected async _terminate(): Promise<void> {
    clearTimeout(this._livenessTimer);
    await this.client.close(0);
  }

  getClient() {
    if (!this.client) throw new Error('SqbClient component is not initialized');
    return this.client;
  }

  protected async _testConnection(abortSignal?: AbortSignal) {
    const onAbort = () => {
      abortSignal?.removeEventListener('abort', onAbort);
      this.client.close(0);
    };
    abortSignal?.addEventListener('abort', onAbort);
    return this.client
      .test()
      .then(() => {
        this.setStatus(ServiceStatus.started);
      })
      .catch(err => {
        const msg = `Database connection failed. ${err.message}`;
        this.logger?.error(msg);
        this.setStatus(ServiceStatus.unhealthy, msg);
        throw err;
      })
      .finally(() => {
        abortSignal?.removeEventListener('abort', onAbort);
      });
  }

  /**
   * Test db connection health every 5 secs
   * @protected
   */
  protected _liveness() {
    this._testConnection()
      .catch(noOp)
      .finally(() => {
        this._resetLiveness();
      });
  }

  protected _resetLiveness() {
    clearTimeout(this._livenessTimer);
    if (this.stopped) return;
    this._livenessTimer = setTimeout(() => {
      this._liveness();
    }, 5000).unref();
  }
}

/**
 * @namespace
 */
export namespace SqbClientComponent {
  export interface Events extends ComponentBase.Events {}
  export const Variables = SqbClientVariables;
  export type Variables = SqbClientVariables;
  export const PoolVariables = SqbClientPoolVariables;
  export type PoolVariables = SqbClientPoolVariables;
}
