# @syncbridge/kafka

Apache Kafka components for SyncBridge, built on
[@platformatic/kafka](https://www.npmjs.com/package/@platformatic/kafka). A
producer sends messages to topics, and a consumer reads them as part of a
consumer group.

## Components

| Component     | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| KafkaProducer | Sends messages to Kafka topics.                                 |
| KafkaConsumer | Reads messages from topics as a member of a consumer group.     |

## Install

SyncBridge servers install modules from the Marketplace or from Console.

The module is also on npm:

```bash
npm install @syncbridge/kafka
```

Peer dependencies: `@syncbridge/common`, `@syncbridge/net` and
`@platformatic/kafka`. The engine provides the `@syncbridge/*` packages. When
you use the module outside the engine, install all three yourself.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { KafkaConsumerComponent, KafkaProducerComponent } from '@syncbridge/kafka';

@App({ description: 'Copies orders to another topic' })
export class OrderCopyApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly input: KafkaConsumerComponent;

  @App.UseComponent({ required: true })
  declare readonly output: KafkaProducerComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.input.on('message', async message => {
      await this.output.send({
        messages: [{ topic: 'orders-copy', value: message.value }],
      });
    });
  }
}
```

## Documentation

https://github.com/panates/syncbridge-public-modules/tree/main/packages/kafka/docs
