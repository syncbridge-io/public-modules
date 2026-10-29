import { DefineVariable, VariableType } from '@syncbridge/common';
import type { KafkaConnectionVariables } from './kafka-client.variables.js';

/**
 * Variables
 */
export class KafkaConsumerVariables {
  @DefineVariable({
    label: 'Connection',
    description: 'Connection variables',
    hotPlug: true,
    index: 100,
  })
  declare connection: KafkaConnectionVariables;

  @DefineVariable({
    label: 'Topics',
    description: 'Topics to subscribe to',
    index: 101,
    type: VariableType.String,
    isArray: true,
    required: true,
    hotPlug: true,
  })
  declare topics: string[];

  @DefineVariable({
    label: 'Group id',
    description: 'Consumer group ID.',
    index: 101,
    hotPlug: true,
    required: true,
  })
  declare groupId: string;

  @DefineVariable({
    label: 'Group Instance Id',
    description: 'Consumer group instance ID. ',
    index: 101,
    hotPlug: true,
  })
  declare groupInstanceId?: string;

  @DefineVariable({
    label: 'Auto Create Topics',
    description:
      'Whether to ask brokers to auto-create missing topics when the topics are looked up.',
    index: 103,
    hotPlug: true,
  })
  declare autocreateTopics: boolean;

  @DefineVariable({
    label: 'Mode',
    description: 'Where to start fetching new messages.',
    index: 101,
    type: VariableType.String,
    enumValues: ['latest', 'earliest', 'committed', 'manual'],
    default: 'latest',
    hotPlug: true,
  })
  declare mode: 'latest' | 'earliest' | 'committed' | 'manual';

  @DefineVariable({
    label: 'Fallback Mode',
    description:
      'Where to start fetching when the mode is `committed` and a partition has no committed offset. `fail` raises an error.',
    index: 101,
    type: VariableType.String,
    enumValues: ['latest', 'earliest', 'fail'],
    default: 'latest',
    hotPlug: true,
  })
  declare fallbackMode: 'latest' | 'earliest' | 'fail';

  @DefineVariable({
    label: 'Max Fetches',
    description:
      'The maximum number of fetches to perform on each partition before automatically closing the stream. ' +
      'Setting to zero will disable automating closing.',
    index: 101,
    default: 0,
    minValue: 0,
    hotPlug: true,
  })
  declare maxFetches: number;

  @DefineVariable({
    label: 'Autocommit',
    description:
      'Whether to autocommit consumed messages. If it is `true`, messages are committed immediately. ' +
      'If it is `false`, each message handed to the app has a `commit` method which ' +
      'the app calls to commit its offset.',
    index: 101,
    default: true,
    hotPlug: true,
  })
  declare autocommit: boolean;

  @DefineVariable({
    label: 'Min Bytes',
    description:
      'Minimum amount of data the brokers should return. The value might not be respected by Kafka.',
    index: 102,
    default: 1,
    minValue: 0,
    hotPlug: true,
  })
  declare minBytes: number;

  @DefineVariable({
    label: 'Max Bytes',
    description:
      'Maximum amount of data the brokers should return. The value might not be respected by Kafka.',
    index: 102,
    default: 50 * 1024 * 1024, // 50MB
    minValue: 0,
    hotPlug: true,
  })
  declare maxBytes: number;

  @DefineVariable({
    label: 'Max Wait Time',
    description:
      'Maximum amount of time in seconds the broker will wait before sending a response to a fetch request.',
    index: 102,
    default: 5, // 5 secs
    minValue: 0,
    hotPlug: true,
  })
  declare maxWaitTime: number;

  @DefineVariable({
    label: 'Isolation Level',
    description:
      'Kind of isolation applied to fetch requests. It can be used to only read producers-committed messages.',
    index: 102,
    type: VariableType.String,
    enumValues: ['read-committed', 'read-uncommitted'],
    hotPlug: true,
  })
  declare isolationLevel?: 'read-committed' | 'read-uncommitted';

  @DefineVariable({
    label: 'Session timeout',
    description:
      'Amount of time in seconds to wait for a consumer to send the heartbeat before considering it down.',
    index: 103,
    default: 60, // 1 minute
    minValue: 0,
    hotPlug: true,
  })
  declare sessionTimeout: number;

  @DefineVariable({
    label: 'Rebalance timeout',
    description:
      'Amount of time in seconds to wait for a consumer to confirm the rebalancing before considering it down.',
    index: 103,
    default: 120, // 2 minutes
    minValue: 0,
    hotPlug: true,
  })
  declare rebalanceTimeout: number;

  @DefineVariable({
    label: 'Heartbeat Interval',
    description:
      'Interval in seconds between heartbeats. Not supported for `groupProtocol=consumer`.',
    index: 103,
    default: 3, // 3 seconds
    minValue: 0,
    hotPlug: true,
  })
  declare heartbeatInterval: number;

  @DefineVariable({
    label: 'Group Protocol',
    description:
      "Group protocol to use. Use `'classic'` for the original consumer group protocol and " +
      "`'consumer'` for the new protocol introduced in [KIP-848](https://cwiki.apache.org/confluence/display/KAFKA/KIP-848%3A+The+Next+Generation+of+the+Consumer+Rebalance+Protocol). " +
      "The `'consumer'` protocol provides server-side partition assignment and incremental rebalancing behavior.",
    index: 103,
    type: VariableType.String,
    enumValues: ['classic', 'consumer'],
    default: 'classic',
    hotPlug: true,
  })
  declare groupProtocol?: 'classic' | 'consumer';

  @DefineVariable({
    label: 'High Watermark',
    description:
      'The maximum amount of messages to store in memory before delaying fetch requests. This value has a large effect on both performance and memory use.',
    index: 105,
    default: 1024,
    minValue: 0,
    hotPlug: true,
  })
  declare highWaterMark: number;
}
