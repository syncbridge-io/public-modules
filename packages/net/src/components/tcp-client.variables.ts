import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable, VariableType } from '@syncbridge/common';
import { getInterfaceAddresses } from '../utils/get-interface-address.js';
import type { SocksVariables } from './socks.variables.js';

/**
 * TLS variables
 */
export class TcpClientTlsVariables {
  @DefineVariable({
    label: 'SNI',
    description: 'SNI (Server Name Indication)',
    hotPlug: true,
  })
  declare servername?: string;

  @DefineVariable({
    label: 'Key',
    description: 'Private keys in PEM format',
    required: true,
    hotPlug: true,
  })
  declare key: string;

  @DefineVariable({
    label: 'Cert',
    description: 'Cert chains in PEM format',
    required: true,
    hotPlug: true,
  })
  declare cert: string;

  @DefineVariable({
    label: 'CA certificates',
    description:
      'Optionally override the trusted CA certificates. Default is to trust the well-known CAs ' +
      "curated by Mozilla. Mozilla's CAs are completely replaced when CAs are explicitly specified " +
      'using this option.',
    required: true,
    hotPlug: true,
  })
  declare ca?: string;

  @DefineVariable({
    type: VariableType.Secret,
    label: 'Passphrase',
    description: 'Passphrase to decrypt the private key',
    hotPlug: true,
  })
  declare passphrase?: string;

  @DefineVariable({
    label: 'Reject unauthorized',
    description:
      'If true will reject any connection which is not authorized with the list of supplied CAs',
    default: true,
    hotPlug: true,
  })
  declare rejectUnauthorized: boolean;
}

/**
 * Reconnect variables
 */
export class TcpClientReconnectVariables {
  @DefineVariable({
    type: VariableType.Enum,
    label: 'Reconnection strategy',
    enumValues: ['exponential', 'fibonacci'],
    default: 'exponential',
    hotPlug: true,
  })
  declare strategy: 'exponential' | 'fibonacci';

  @DefineVariable({
    label: 'Initial delay',
    description: 'Initial delay in milliseconds',
    default: 2000,
    hotPlug: true,
  })
  declare initialDelay: number;

  @DefineVariable({
    label: 'Maximum delay',
    description: 'Maximum delay in milliseconds',
    default: 10000,
    hotPlug: true,
  })
  declare maxDelay: number;
}

/**
 * Variables
 */
export class TcpClientVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({
    label: 'Host',
    description: 'Hostname or IP address to be connected to',
    required: true,
    index: 100,
    hotPlug: true,
  })
  declare host: string;

  @DefineVariable({
    label: 'Port',
    description: 'Port number of target listener',
    required: true,
    minValue: 1,
    maxValue: 65535,
    index: 101,
    hotPlug: true,
  })
  declare port: number;

  @DefineVariable({
    label: 'Bind Interface',
    description:
      'Interface address to bind to. If not specified, will bind to all available addresses',
    type: VariableType.Enum,
    enumValues: getInterfaceAddresses(),
    index: 120,
    hotPlug: true,
  })
  declare bindInterface?: string;

  @DefineVariable({
    label: 'Keep alive',
    description: 'Enables keep-alive on the TCP socket',
    default: false,
    index: 102,
    hotPlug: true,
  })
  declare keepAlive: boolean;

  @DefineVariable({
    label: 'Connect timeout',
    description: 'Connection timeout in milliseconds',
    default: 10000,
    index: 103,
    hotPlug: true,
  })
  declare connectTimeout: number;

  @DefineVariable({
    label: 'Reconnect',
    description: 'Reconnect options',
    hotPlug: true,
  })
  declare reconnect: TcpClientReconnectVariables;

  @DefineVariable({
    label: 'TLS Enabled',
    hotPlug: true,
  })
  declare tls_enabled: boolean;

  @DefineVariable({
    label: 'TLS',
    description: 'TLS options',
    hotPlug: true,
  })
  declare tls: TcpClientTlsVariables;

  @DefineVariable({
    label: 'Proxy Enabled',
    hotPlug: true,
  })
  declare proxy_enabled: boolean;

  @DefineVariable({
    label: 'Proxy',
    description: 'Proxy options',
    hotPlug: true,
  })
  declare proxy: SocksVariables;
}
