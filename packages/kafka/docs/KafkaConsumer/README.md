# KafkaConsumer

Reads messages from Kafka topics as a member of a consumer group. Use it when
an app must react to messages in a Kafka cluster. The app listens to the
`message` event; the component keeps the client, the stream and the
connection. See [Consumer groups](consumer-groups.md) for how the group
settings work.

## Settings

The Connection group (brokers, timeouts, SASL, TLS) is described in
[Connection settings](../connection-settings.md). Times are in seconds unless
noted.

| Setting             | Key                  | Description                                                                                                                                      | Default             | Required |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------- |
| Connection          | `connection`         | Connection settings.                                                                                                                             |                     | No       |
| Topics              | `topics`             | Topics to subscribe to.                                                                                                                          |                     | Yes      |
| Group id            | `groupId`            | Consumer group ID.                                                                                                                               |                     | Yes      |
| Group Instance Id   | `groupInstanceId`    | Consumer group instance ID.                                                                                                                      |                     | No       |
| Mode                | `mode`               | Where to start fetching messages: `latest`, `earliest`, `committed` or `manual`.                                                                 | `latest`            | No       |
| Fallback Mode       | `fallbackMode`       | Where to start when `mode` is `committed` and there is no committed offset: `latest`, `earliest` or `fail`.                                      | `latest`            | No       |
| Max Fetches         | `maxFetches`         | Maximum number of fetches on each partition before the stream closes by itself. `0` disables it.                                                 | 0                   | No       |
| Autocommit          | `autocommit`         | Commit consumed messages automatically. If off, each message has a `commit` method to call.                                                      | true                | No       |
| Auto Create Topics  | `autocreateTopics`   | Ask the brokers to create missing topics.                                                                                                        |                     | No       |
| Min Bytes           | `minBytes`           | Minimum amount of data the brokers should return. Brokers may not respect it.                                                                    | 1                   | No       |
| Max Bytes           | `maxBytes`           | Maximum amount of data the brokers should return. Brokers may not respect it.                                                                    | 52428800 (50 MB)    | No       |
| Max Wait Time       | `maxWaitTime`        | Maximum time the broker waits before it answers a fetch request. The component multiplies the value by 1000, so it is in seconds.                | 5                   | No       |
| Isolation Level     | `isolationLevel`     | `read-committed` reads only committed messages of producers. Any other value, or none, reads uncommitted messages too.                           |                     | No       |
| Session timeout    | `sessionTimeout`     | Seconds to wait for a heartbeat before the consumer is considered down.                                                                          | 60                  | No       |
| Rebalance timeout   | `rebalanceTimeout`   | Seconds to wait for a consumer to confirm a rebalance before it is considered down.                                                              | 120                 | No       |
| Heartbeat Interval  | `heartbeatInterval`  | Seconds between heartbeats. Not supported with the `consumer` group protocol.                                                                    | 3                   | No       |
| Group Protocol      | `groupProtocol`      | `classic` for the original consumer group protocol, `consumer` for the protocol of KIP-848 (server-side assignment, incremental rebalancing).    | `classic`           | No       |
| High Watermark      | `highWaterMark`      | Maximum number of messages kept in memory before fetch requests are delayed. A high value costs memory.                                          | 1024                | No       |

## Events

| Event        | Arguments | Emitted when                                                           |
| ------------ | --------- | ---------------------------------------------------------------------- |
| `message`    | `message` | A message is read. See below.                                          |
| `connect`    |           | A connection to a broker is made.                                      |
| `disconnect` |           | A connection to a broker is closed.                                    |
| `error`      | `error`   | Starting the stream fails, the stream fails, or a listener of `message` rejects. |

`message` is a `@platformatic/kafka` message: `topic`, `partition`, `offset`,
`key`, `value`, `headers`, `timestamp`, and `commit()` when Autocommit is off.
Keys and values are `Buffer`s.

## Methods

- `consumer` is the underlying `@platformatic/kafka` consumer, and `stream` the
  stream of messages it returned. Both are replaced when the settings change or
  the component starts again: read them when you need them.

The component has no methods of its own: an app reads messages through events.

## Communication log

The `communication` channel is off by default; turn it on in the profile's log
settings.

| Direction | Event        | Data                                                         | Details                    | Written when                                  |
| --------- | ------------ | ------------------------------------------------------------ | -------------------------- | --------------------------------------------- |
| `in`      |              | The message value: bytes and text as they are, else as JSON  | `topic[partition]@offset`  | A message is read, before `message` is emitted. |
| `info`    | `connect`    |                                                              |                            | A broker connection is made.                  |
| `info`    | `disconnect` |                                                              |                            | A broker connection is closed.                |
| `info`    | `error`      |                                                              |                            | A broker connection failed (`Kafka broker failed`). |

## Status

- Started: a broker connection is made.
- Unhealthy: the stream cannot be started, the stream fails, a broker
  connection fails (`Kafka broker failed`), or a connection is lost while the
  component runs (`Kafka broker disconnected unexpectedly`).
- Stopped: the stream and the client are closed. A disconnect while stopping is
  expected and does not make the component unhealthy.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { KafkaConsumerComponent } from '@syncbridge/kafka';

@App({ description: 'Handles new orders' })
export class OrderHandlerApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly orders: KafkaConsumerComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.orders.on('message', async message => {
      const order = JSON.parse(String(message.value));
      await this.handle(order);
    });
    this.orders.on('error', err => this.emit('error', err));
  }

  private async handle(order: unknown): Promise<void> {
    // ...
  }
}
```

## Notes

- When a setting changes, the stream and the client are closed and a new client
  is created; if the component was running, it starts reading again.
- Consumption begins when the component starts, from the position Mode names.
  Add the `message` listener in the app's `_init()`, so no message is missed.
