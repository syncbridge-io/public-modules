import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { IoServerBaseComponent, peerOf } from '@syncbridge/builtins';
import { Component, LogChannel } from '@syncbridge/common';
import {
  HttpServerProtocolVariables,
  HttpServerVariables,
} from './http-server.variables.js';
import {
  TcpServerTlsVariables,
  TcpServerVariables,
  tcpServerVariablesToNodeOptions,
} from './tcp-server.variables.js';

/**
 * HttpServer component
 */
@Component({
  className: 'HttpServer',
  displayName: 'Http Server',
  description: 'Http server component',
  tags: ['http', 'https', 'server'],
})
export class HttpServerComponent<
  TEvents extends HttpServerComponent.Events = HttpServerComponent.Events,
> extends IoServerBaseComponent<TEvents> {
  declare server: http.Server;

  @Component.UseVariables()
  declare values: HttpServerVariables;

  /** The requests it is sent and what it answers; not their bodies */
  @LogChannel({
    name: 'communication',
    title: 'Communication',
    description: 'The requests it is sent and what it answers',
    kind: 'transmit',
    retentionDays: 14,
    /* Off unless turned on, as every component's communication */
    enabled: false,
    events: ['request', 'response'],
  })
  declare readonly communicationLog: LogChannel;

  protected async _init(): Promise<void> {
    await super._init();
    const serverOptions = HttpServerComponent.variablesToNodeOptions(
      this.values,
    );
    if (this.values.tls_enabled) {
      this.server = https.createServer(serverOptions);
    } else this.server = http.createServer(serverOptions);
    this.server.on('request', (req, res) => this._watchRequest(req, res));
    this.server.once('listening', () => {
      this.logger?.info(
        `Http listener started on ` +
          (this.values.tls_enabled ? 'https' : 'http') +
          '://' +
          (this.values.bindInterface || 'localhost:') +
          this.values.port,
      );
    });
  }

  /** A request and its answer, for the communication channel */
  protected _watchRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const started = Date.now();
    const details = peerOf({
      address: req.socket.remoteAddress,
      port: req.socket.remotePort,
    });
    const what = `${req.method} ${req.url}`;
    this.communicationLog?.write({
      direction: 'in',
      event: 'request',
      message: what,
      details,
    });
    res.once('finish', () =>
      this.communicationLog?.write({
        direction: 'out',
        event: 'response',
        message: `${res.statusCode} ${what} (${Date.now() - started} ms)`,
        details,
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _start(abortSignal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onListening = () => {
        this.server.removeListener('error', onListening);
        resolve();
      };
      const onError = error => {
        this.server.removeListener('listening', onListening);
        reject(error);
      };
      this.server.once('listening', onListening);
      this.server.once('error', onError);
      this.server.listen(this.values.port, this.values.bindInterface);
    });
  }

  protected async _stop(): Promise<void> {
    return new Promise<void>(resolve => {
      this.server.close(() => resolve());
    });
  }
}

/**
 * @namespace
 */
export namespace HttpServerComponent {
  export interface Events extends IoServerBaseComponent.Events {}

  export const Variables = HttpServerVariables;
  export const TlsVariables = TcpServerTlsVariables;
  export const ProtocolVariables = HttpServerProtocolVariables;
  export type Variables = HttpServerVariables;
  export type TlsVariables = TcpServerTlsVariables;
  export type ProtocolVariables = HttpServerProtocolVariables;

  export function variablesToNodeOptions(
    values: TcpServerVariables,
  ): tls.TlsOptions {
    return tcpServerVariablesToNodeOptions(values);
  }
}
