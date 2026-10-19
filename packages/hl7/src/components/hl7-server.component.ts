import net, { type AddressInfo } from 'node:net';
import { peerOf } from '@syncbridge/builtins';
import {
  Component,
  ComponentBase,
  LogChannel,
  SbError,
  ServiceStatus,
} from '@syncbridge/common';
import { TcpServerComponent } from '@syncbridge/net';
import colors from 'ansi-colors';
import { HL7Message } from 'hl7v2';
import {
  type HL7Middleware,
  type HL7ResponseHook,
  HL7Server,
  HL7Socket,
} from 'hl7v2-net';
import { hl7ProtocolOptions } from './hl7-protocol.variables.js';
import { HL7ServerVariables } from './hl7-server.variables.js';

/**
 * HL7Server component
 */
@Component({
  className: 'HL7Server',
  displayName: 'HL7 Server',
  description: 'HL7 server component',
  tags: ['hl7', 'server'],
})
export class HL7ServerComponent<
  TEvents extends HL7ServerComponent.Events = HL7ServerComponent.Events,
> extends ComponentBase<TEvents> {
  protected _stopping?: boolean;
  /**
   * Handlers added with use(), kept by the component: the server is created
   * again whenever the values change, and each new one gets them all
   */
  protected readonly _middlewares: {
    handler: HL7Middleware;
    priority?: number;
  }[] = [];
  /** beforeResponse() hooks, kept for the same reason */
  protected readonly _responseHooks: HL7ResponseHook[] = [];
  declare server: HL7Server;

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
  declare values: HL7ServerVariables;

  protected async _init(): Promise<void> {
    await super._init();
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
    this.on('values-updated', () =>
      this._restart().catch(err =>
        this.setStatus(ServiceStatus.unhealthy, err.message),
      ),
    );
    this._createServer();
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    this._stopping = false;
    this._createServer();
    await this.server.listen(this.values.port, this.values.bindInterface);
    await super._start(abortSignal);
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await this.server.close(30000);
    return super._stop();
  }

  /** A server of the current values, for the next start */
  protected _createServer() {
    const options: HL7Server.Options = {
      ...hl7ProtocolOptions(this.values),
      responseTimeout: this.values.responseTimeout,
    };
    this.server =
      this.values.tls_enabled && this.values.tls
        ? HL7Server.createTlsServer(this.values.tls, options)
        : HL7Server.createServer(undefined, options);
    for (const m of this._middlewares) this.server.use(m.handler, m.priority);
    for (const hook of this._responseHooks) this.server.beforeResponse(hook);
    this.server.on('error', (error: any, socket: HL7Socket) => {
      if (error.code === 'ECONNRESET') return;
      if (socket) {
        error.message =
          error.message +
          ` [${colors.blueBright(socket?.remoteAddress || '')}]`;
      }
      error = new SbError(error);
      if (socket) {
        const info = {
          address: socket.remoteAddress,
          toString: () => socket.remoteAddress,
        };
        this.emit('error', error, info, socket);
      } else {
        if (!this.server.listening)
          this.setStatus(ServiceStatus.unhealthy, error.message);
        this.emit('error', error);
      }
    });
    this.server.on('listening', () => {
      this.logger?.info(
        `HL7 server listening on port ${colors.blueBright(String(this.values.port))}`,
      );
      this.emit('listening');
    });
    this.server.on('close', () => this.emit('close'));
    this.server.on('connection', (socket: HL7Socket) => {
      this.logger?.trace(
        `Connection from: ${colors.blueBright(socket.remoteAddress || '')}`,
      );
      const info = {
        address: socket.remoteAddress,
        port: socket.remotePort,
        toString: () => socket.remoteAddress,
      };
      this.communicationLog?.write({
        direction: 'info',
        event: 'connect',
        message: 'Connected',
        details: peerOf(info),
      });
      this.emit('connection', info, socket);
    });

    this.server.on('disconnect', (socket: HL7Socket) => {
      this.logger?.trace(
        `Disconnected: ${colors.blueBright(socket.remoteAddress || '')}`,
      );
      const info = {
        address: socket.remoteAddress,
        port: socket.remotePort,
        toString: () => socket.remoteAddress,
      };
      this.communicationLog?.write({
        direction: 'info',
        event: 'disconnect',
        message: 'Disconnected',
        details: peerOf(info),
      });
      this.emit('disconnect', info, socket);
    });
    this.server.on('message', (message, socket: HL7Socket) => {
      this.logger?.trace(
        `HL7 message (${message.messageType}) received from ${colors.blueBright(socket.remoteAddress || '')}`,
      );
      const info = {
        address: socket.remoteAddress,
        port: socket.remotePort,
        toString: () => socket.remoteAddress,
      };
      this.emit('message', message, info, socket);
    });
    this.server.on('send', (message, socket: HL7Socket) => {
      this.logger?.trace(
        `HL7 message (${message.messageType}) sent to ${colors.blueBright(socket.remoteAddress || '')}`,
      );
      const info = {
        address: socket.remoteAddress,
        port: socket.remotePort,
        toString: () => socket.remoteAddress,
      };
      this.emit('send', message, info, socket);
    });
    this.server.on('data', (data, socket: HL7Socket) => {
      const info = {
        address: socket.remoteAddress,
        port: socket.remotePort,
        toString: () => socket.remoteAddress,
      };
      this.emit('data', data, info, socket);
    });
    this.server.on('write', (data, socket: HL7Socket) => {
      const info = {
        address: socket.remoteAddress,
        port: socket.remotePort,
        toString: () => socket.remoteAddress,
      };
      this.emit('transmit', data, info, socket);
    });
  }

  /**
   * Adds a handler for received messages. It stays when the server is
   * created again for new values.
   */
  use(handler: HL7Middleware, priority?: number): void {
    this._middlewares.push({ handler, priority });
    this.server?.use(handler, priority);
  }

  /**
   * Adds a hook that sees every answer to a received message before it is
   * sent, and may change it, replace it (return another message) or drop
   * it (return null) - for a device that expects other acknowledgments
   * than the standard ones. It stays when the server is created again for
   * new values. See hl7v2-net's beforeResponse.
   */
  beforeResponse(hook: HL7ResponseHook): void {
    this._responseHooks.push(hook);
    this.server?.beforeResponse(hook);
  }
}

/**
 * @namespace
 */
export namespace HL7ServerComponent {
  export interface Events extends ComponentBase.Events {
    listening: [];
    close: [];
    connection: [info: AddressInfo, socket: HL7Socket];
    disconnect: [info: AddressInfo, socket: HL7Socket];
    drop: [data?: net.DropArgument];
    error: [error: Error, info?: AddressInfo, socket?: HL7Socket | undefined];
    warning: [
      error: Error | string,
      info: AddressInfo,
      socket: HL7Socket | undefined,
    ];
    message: [message: HL7Message, info: AddressInfo, socket: HL7Socket];
    transmit: [message: HL7Message, info: AddressInfo, socket: HL7Socket];
  }

  export const Variables = HL7ServerVariables;
  export type Variables = HL7ServerVariables;
  export const TlsVariables: typeof TcpServerComponent.TlsVariables =
    TcpServerComponent.TlsVariables;
  export type TlsVariables = TcpServerComponent.TlsVariables;
}
