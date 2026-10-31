# KafkaProducer

Sends messages to Kafka topics. Use it when an app must write messages to a
Kafka cluster. The app calls `send()`; the component keeps the client and the
connection.

## Changing settings

All connection settings can change while the component runs. The component
then closes its client and creates a new one; if it was running, it starts
again, with the status `starting` while it does. A component that is
stopped stays stopped.

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

## Dashboard

The component has a dashboard, `kafka` (`KafkaDashboard`). A component's
widgets are not a tab of their own: an app shows those it takes with
`include`, and the others are not written at all.

| Widget            | Id       | Shows                                                               |
| ----------------- | -------- | ------------------------------------------------------------------- |
| Brokers           | `link`   | `Not connected` at first; `Connected`; `Disconnected` (a warning) or `Kafka broker failed` (an error). |
| Messages          | `rate`   | Messages a second sent, a chart of the last 200 seconds.      |
| Errors            | `errors` | The `error` events and the `send()` calls that failed, since the worker started; a warning from the first.                               |
| Messages by topic | `topics` | A bar per topic, the messages sent since the worker started.  |

The rate is counted with the chart's `count()`: summed in the worker and
written as one point a second, however busy the topics are. The messages'
contents are not shown: they are in the communication log, when it is on.

```ts
@App({ displayName: 'Invoices' })
export class MyApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly producer: KafkaProducerComponent;

  @UseDashboard({ title: 'Kafka', include: [{ component: 'producer' }] })
  declare readonly kafkaTab: DashboardBase;
}
```

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
