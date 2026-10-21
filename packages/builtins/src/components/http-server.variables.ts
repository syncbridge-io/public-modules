import https from 'node:https';
import { DefineVariable } from '@syncbridge/common';
import {
  TcpServerVariables,
  tcpServerVariablesToNodeOptions,
} from './tcp-server.variables.js';

export class HttpServerProtocolVariables {
  @DefineVariable({
    label: 'Socket timeout',
    description:
      'The number of milliseconds of inactivity before a socket is presumed to have timed out.\n' +
      'A value of 0 will disable the timeout behavior on incoming connections.\n' +
      'The socket timeout logic is set up on connection, so changing this value only affects new connections to the server, not any existing connections.',
    default: 0,
    index: 131,
  })
  declare timeout?: number;

  @DefineVariable({
    label: 'Request timeout',
    description:
      'Sets the timeout value in milliseconds for receiving the entire request from the client.\n' +
      'If the timeout expires, the server responds with status 408 without forwarding the request to the request listener and then closes the connection.\n' +
      'It must be set to a non-zero value (e.g. 120 seconds) to protect against potential Denial-of-Service attacks in case the server is deployed without a reverse proxy in front.',
    default: 300000,
    index: 132,
  })
  declare requestTimeout?: number;

  @DefineVariable({
    label: 'Headers Timeout',
    description:
      'Limit the amount of time the parser will wait to receive the complete HTTP headers.\n' +
      'If the timeout expires, the server responds with status 408 without forwarding the request to the request listener and then closes the connection.\n' +
      'It must be set to a non-zero value (e.g. 120 seconds) to protect against potential Denial-of-Service attacks in case the server is deployed without a reverse proxy in front.',
    default: 60000,
    index: 133,
  })
  declare headersTimeout?: number;

  @DefineVariable({
    label: 'Keep Alive Timeout',
    description:
      'The number of milliseconds of inactivity a server needs to wait for additional incoming data, ' +
      'after it has finished writing the last response, before a socket will be destroyed.',
    default: 5000,
    index: 134,
  })
  declare keepAliveTimeout?: number;

  @DefineVariable({
    label: 'Keep Alive Timeout Buffer',
    description:
      'An additional buffer time added to the "keepAliveTimeout" to extend the internal socket timeout.',
    default: 1000,
    index: 135,
  })
  declare keepAliveTimeoutBuffer?: number;

  @DefineVariable({
    label: 'Max Headers Count',
    description:
      'Limits maximum incoming headers count. If set to 0, no limit will be applied.',
    default: 2000,
    index: 136,
  })
  declare maxHeadersCount?: number;

  @DefineVariable({
    label: 'Max Header Size',
    description:
      'Sets maximum header size for requests received by this server, i.e. the maximum length of request headers in bytes.',
    default: 16384,
    index: 137,
  })
  declare maxHeaderSize?: number;

  @DefineVariable({
    label: 'Connections Checking Interval',
    description:
      'Interval in milliseconds at which the server checks for requests that passed the request or headers timeout.',
    default: 30000,
    index: 138,
  })
  declare connectionsCheckingInterval?: number;
}

/**
 * Variables
 */
export class HttpServerVariables extends TcpServerVariables {
  @DefineVariable({
    label: 'Http Protocol Options',
    description: 'Http Protocol Options',
  })
  declare http: HttpServerProtocolVariables;
}

export function httpServerVariablesToNodeOptions(
  values: HttpServerVariables,
): https.ServerOptions {
  const serverOptions: https.ServerOptions =
    tcpServerVariablesToNodeOptions(values);
  if (values.http) Object.assign(serverOptions, values.http);
  return serverOptions;
}
