import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable } from '@syncbridge/common';
import { TcpClientComponent } from '@syncbridge/net';
import * as ioredis from 'ioredis';

/**
 * Variables
 */
export class CommonRedisVariables
  extends IoClientBaseComponent.Variables
  implements ioredis.CommonRedisOptions
{
  @DefineVariable({
    label: 'Database',
    description: 'Database index to use.',
    index: 200,
  })
  declare db?: number;

  @DefineVariable({
    label: 'Auto Resubscribe',
    description:
      'When the client reconnects, channels subscribed in the previous connection will be resubscribed automatically',
    index: 200,
  })
  declare autoResubscribe?: boolean;

  @DefineVariable({
    label: 'Auto Resend Unfulfilled Commands',
    description:
      'Whether or not to resend unfulfilled commands on reconnect. Unfulfilled commands are most likely to be blocking commands such as brpop or blpop.',
    index: 200,
  })
  declare autoResendUnfulfilledCommands?: boolean;

  @DefineVariable({
    label: 'Keep alive',
    description:
      'Initial delay in milliseconds before the first keep-alive probe on the TCP socket',
    index: 200,
  })
  declare keepAlive?: number;

  @DefineVariable({
    label: 'No Delay',
    description: "Enable/disable the use of Nagle's algorithm",
    index: 200,
  })
  declare noDelay?: boolean;

  @DefineVariable({
    label: 'Connection Name',
    description:
      'Set the name of the connection to make it easier to identity the connection in client list.',
    index: 200,
  })
  declare connectionName?: string;

  @DefineVariable({
    label: 'Max Retries Per Request',
    description:
      "The commands that don't get a reply due to the connection to the server is lost are put into a queue and will be " +
      'resent on reconnect (if allowed by the retryStrategy option). This option is used to configure how many reconnection ' +
      'attempts should be allowed before the queue is flushed with a MaxRetriesPerRequestError error. ' +
      'Set this options to -1 instead of a number to let commands wait forever until the connection is alive again.',
    index: 200,
  })
  declare maxRetriesPerRequest?: number;

  @DefineVariable({
    label: 'Command Timeout',
    description:
      'If a command does not return a reply within a set number of milliseconds, a "Command timed out" error will be thrown.',
    index: 200,
  })
  declare commandTimeout?: number;

  @DefineVariable({
    label: 'Disconnect Timeout',
    description:
      'The maximum time in milliseconds to wait for the connection to close.',
    index: 200,
  })
  declare disconnectTimeout?: number;

  @DefineVariable({
    label: 'TLS Enabled',
    index: 200,
    default: false,
  })
  declare tls_enabled: boolean;

  @DefineVariable({
    label: 'TLS',
    description: 'TLS options',
    index: 200,
  })
  declare tls?: TcpClientComponent.TlsVariables;
}
