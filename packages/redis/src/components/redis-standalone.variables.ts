import { DefineVariable } from '@syncbridge/common';
import { CommonRedisVariables } from './common-redis.variables.js';

export class RedisStandaloneVariables extends CommonRedisVariables {
  @DefineVariable({
    label: 'Host',
    description: 'Hostname or IP address to be connected to',
    default: 'localhost',
    index: 100,
  })
  declare host: string;

  @DefineVariable({
    label: 'Port',
    description: 'Port number of target listener',
    default: 6379,
    minValue: 1,
    maxValue: 65535,
    index: 100,
  })
  declare port: number;

  @DefineVariable({
    label: 'Username',
    description:
      'If set, client will send AUTH command with the value of this option as the first argument when connected. This is supported since Redis 6.',
    index: 100,
  })
  declare username?: string;

  @DefineVariable({
    label: 'Password',
    description:
      'If set, client will send AUTH command with the value of this option when connected.',
    index: 100,
  })
  declare password?: string;
}
