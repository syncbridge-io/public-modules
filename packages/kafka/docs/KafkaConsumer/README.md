# KafkaConsumer

Reads messages from Kafka topics as a member of a consumer group. Use it when
an app must react to messages in a Kafka cluster. The app listens to the
`message` event; the component keeps the client, the stream and the
connection. See [Consumer groups](consumer-groups.md) for how the group
settings work.

## Changing settings

All connection settings can change while the component runs. The component
then closes its client and creates a new one; if it was running, it starts
again, with the status `starting` while it does. A component that is
stopped stays stopped.

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

## Dashboard

The component has a dashboard, `kafka` (`KafkaDashboard`). A component's
widgets are not a tab of their own: an app shows those it takes with
`include`, and the others are not written at all.

| Widget            | Id       | Shows                                                               |
| ----------------- | -------- | ------------------------------------------------------------------- |
| Brokers           | `link`   | `Not connected` at first; `Connected`; `Disconnected` (a warning) or `Kafka broker failed` (an error). |
| Messages          | `rate`   | Messages a second read, a chart of the last 200 seconds.      |
| Errors            | `errors` | The `error` events since the worker started; a warning from the first.                               |
| Messages by topic | `topics` | A bar per topic, the messages read since the worker started.  |

The rate is counted with the chart's `count()`: summed in the worker and
written as one point a second, however busy the topics are. The messages'
contents are not shown: they are in the communication log, when it is on.

```ts
@App({ displayName: 'Orders' })
export class MyApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly consumer: KafkaConsumerComponent;

  @UseDashboard({ title: 'Kafka', include: [{ component: 'consumer' }] })
  declare readonly kafkaTab: DashboardBase;
}
```

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
