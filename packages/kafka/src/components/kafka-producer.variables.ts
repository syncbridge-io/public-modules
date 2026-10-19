import { DefineVariable, VariableType } from '@syncbridge/common';
import type { KafkaConnectionVariables } from './kafka-client.variables.js';

/**
 * Variables
 */
export class KafkaProducerVariables {
  @DefineVariable({
    label: 'Connection',
    description: 'Connection variables',
    hotPlug: true,
    index: 100,
  })
  declare connection: KafkaConnectionVariables;

  @DefineVariable({
    label: 'Producer id',
    description: 'Producer ID.',
    index: 101,
    type: VariableType.BigInt,
    hotPlug: true,
  })
  declare producerId: bigint;

  @DefineVariable({
    label: 'Producer Epoch',
    description: 'Producer epoch.',
    index: 101,
    hotPlug: true,
  })
  declare producerEpoch: number;

  @DefineVariable({
    label: 'Auto Create Topics',
    description:
      'Whether to ask brokers to auto-create missing topics during produce requests.',
    index: 103,
    hotPlug: true,
  })
  declare autocreateTopics: boolean;

  @DefineVariable({
    label: 'Idempotent',
    description: 'Idempotency of the producer. Required for transactions.',
    hotPlug: true,
  })
  declare idempotent?: boolean;

  @DefineVariable({
    label: 'Transactional ID',
    description:
      'Transactional ID for the producer. If not specified, a random UUID is generated. ' +
      'Required when using transactions to ensure the same ID is used across restarts.',
    hotPlug: true,
  })
  declare transactionalId?: string;

  @DefineVariable({
    label: 'ACKs',
    description: 'Acknowledgement to wait before returning',
    index: 101,
    enumValues: ['all', 'no-response', 'leader'],
    hotPlug: true,
  })
  declare acks?: 'all' | 'no-response' | 'leader';

  @DefineVariable({
    label: 'Compression',
    description:
      'Compression algorithm to use before sending messages to the broker.',
    index: 102,
    hotPlug: true,
    enumValues: [`snappy`, `lz4`, `gzip`, `zstd`],
  })
  declare compression?: `snappy` | `lz4` | `gzip` | `zstd`;

  @DefineVariable({
    label: 'Repeat OnStale Metadata',
    description:
      'Whether to retry a produce operation when the system detects outdated topic or broker information.',
    index: 103,
    default: true,
    hotPlug: true,
  })
  declare repeatOnStaleMetadata: boolean;
}
