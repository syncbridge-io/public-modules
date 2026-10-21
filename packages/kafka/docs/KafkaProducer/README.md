# KafkaProducer

Sends messages to Kafka topics. Use it when an app must write messages to a
Kafka cluster. The app calls `send()`; the component keeps the client and the
connection.

## Settings

The Connection group (brokers, timeouts, SASL, TLS) is described in
[Connection settings](../connection-settings.md).

| Setting                 | Key                     | Description                                                                                                                                        | Default | Required |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| Connection              | `connection`            | Connection settings.                                                                                                                               |         | No       |
| Producer id             | `producerId`            | Producer ID (a big integer).                                                                                                                       |         | No       |
| Producer Epoch          | `producerEpoch`         | Producer epoch.                                                                                                                                    |         | No       |
| Auto Create Topics      | `autocreateTopics`      | Ask the brokers to create missing topics during produce requests.                                                                                  |         | No       |
| Idempotent              | `idempotent`            | Idempotency of the producer. Required for transactions.                                                                                            |         | No       |
| Transactional ID        | `transactionalId`       | Transactional ID of the producer. Without it, a random UUID is generated. Required when you use transactions, so the same ID is used across restarts. |       | No       |
| ACKs                    | `acks`                  | Acknowledgment to wait for before `send()` returns: `all`, `leader` or `no-response`. Without a value, the client's default applies.               |         | No       |
| Compression             | `compression`           | Compression of messages sent to the broker: `snappy`, `lz4`, `gzip` or `zstd`.                                                                     |         | No       |
| Repeat OnStale Metadata | `repeatOnStaleMetadata` | Retry a produce operation when the client detects outdated topic or broker information.                                                            | true    | No       |

## Events

| Event        | Arguments | Emitted when                                                  |
| ------------ | --------- | ------------------------------------------------------------- |
| `connect`    |           | A connection to a broker is made.                             |
| `disconnect` |           | A connection to a broker is closed.                           |
| `error`      | `error`   | The first request to the broker fails when the component starts. |

## Methods

- `send(options)` sends messages and resolves with the produce result of
  `@platformatic/kafka`. `options.messages` is an array of
  `{ topic, key?, value?, partition?, headers? }`. Keys and values are
  `Buffer`s. It rejects with the client's error when the messages cannot be
  sent; it does not check the component's status first.
- `producer` is the underlying `@platformatic/kafka` producer. It is replaced
  when the settings change: read `component.producer` when you need it.

## Communication log

The `communication` channel is off by default; turn it on in the profile's log
settings.

| Direction | Event        | Data                                                           | Details                       | Written when                                  |
| --------- | ------------ | -------------------------------------------------------------- | ----------------------------- | --------------------------------------------- |
| `out`     |              | The message value: bytes and text as they are, else as JSON    | `topic[partition]@offset`     | After `send()` succeeds, once per message.    |
| `info`    | `connect`    |                                                                |                               | A broker connection is made.                  |
| `info`    | `disconnect` |                                                                |                               | A broker connection is closed.                |
| `info`    | `error`      |                                                                |                               | A broker connection failed (`Kafka broker failed`). |

For a sent message, the details hold the topic and, when the message names
them, the partition: `orders[0]`, or `orders`. A message that fails to send is
not written.

## Status

- Started: a broker connection is made.
- Unhealthy: the first request to the broker fails when the component starts,
  a broker connection fails (`Kafka broker failed`), or a connection is lost
  while the component runs (`Kafka broker disconnected unexpectedly`).
- Stopped: the client is closed. A disconnect while stopping is expected and
  does not make the component unhealthy.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { KafkaProducerComponent } from '@syncbridge/kafka';

@App({ description: 'Publishes orders' })
export class OrderPublisherApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly kafka: KafkaProducerComponent;

  async publish(order: object): Promise<void> {
    await this.kafka.send({
      messages: [
        { topic: 'orders', value: Buffer.from(JSON.stringify(order)) },
      ],
    });
  }
}
```

## Notes

- When a setting changes, the client is closed and a new one is created; the
  component is `starting` meanwhile.
