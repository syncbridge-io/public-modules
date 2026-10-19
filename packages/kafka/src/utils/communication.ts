import type { LogChannel } from '@syncbridge/common';

/** The communication channel of a Kafka component: its broker connections and messages */
export const COMMUNICATION_CHANNEL: LogChannel.Options = {
  name: 'communication',
  title: 'Communication',
  description:
    'Its connections to the brokers, and the messages it reads or writes',
  kind: 'transmit',
  retentionDays: 14,
  /* Off unless turned on, as every component's communication */
  enabled: false,
  events: ['connect', 'disconnect', 'read', 'write'],
};

/** A message's value as a record's data: bytes and text as they are, anything else as JSON */
export function messageData(value: unknown): Uint8Array | string | undefined {
  if (value == null) return;
  if (typeof value === 'string' || value instanceof Uint8Array) return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Where a message is, as a record's details: `topic[partition]@offset` */
export function messageDetails(message: {
  topic?: string;
  partition?: number;
  offset?: bigint | number;
}): string | undefined {
  if (!message.topic) return;
  let out = message.topic;
  if (message.partition != null) out += `[${message.partition}]`;
  if (message.offset != null) out += `@${message.offset}`;
  return out;
}
