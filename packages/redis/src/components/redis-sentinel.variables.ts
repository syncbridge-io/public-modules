import { DefineVariable, VariableType } from '@syncbridge/common';
import { TcpClientComponent } from '@syncbridge/net';
import { CommonRedisVariables } from './common-redis.variables.js';

/**
 *
 */
export class Address {
  @DefineVariable({
    label: 'Host',
    description: 'Hostname or IP address to be connected to',
    required: true,
    index: 100,
  })
  declare host: string;

  @DefineVariable({
    label: 'Port',
    description: 'Port number of target listener',
    required: true,
    minValue: 1,
    maxValue: 65535,
    index: 100,
  })
  declare port: number;
}

/**
 *
 */
export class RedisSentinelVariables extends CommonRedisVariables {
  @DefineVariable({
    label: 'Name',
    description: 'Master group name of the Sentinel',
    required: true,
    index: 100,
  })
  declare name: string;

  @DefineVariable({
    label: 'Username',
    description:
      'If set, client will send AUTH command with the value of this option as the first argument when connected. This is supported since Redis 6.',
  })
  declare username?: string;

  @DefineVariable({
    label: 'Password',
    description:
      'If set, client will send AUTH command with the value of this option when connected.',
    index: 100,
    type: VariableType.Secret,
  })
  declare password?: string;

  @DefineVariable({
    label: 'Sentinels',
    description: 'Sentinels to be connected to',
    required: true,
    index: 100,
    type: VariableType.Nested,
    isArray: true,
    variables: Address,
  })
  declare sentinels: Address[];

  @DefineVariable({
    label: 'Sentinel TLS Enabled',
    index: 100,
    default: false,
  })
  declare sentinelTls_enabled: boolean;

  @DefineVariable({
    label: 'Sentinel TLS',
    description: 'Sentinel TLS options',
    index: 100,
  })
  declare sentinelTls?: TcpClientComponent.TlsVariables;
}
