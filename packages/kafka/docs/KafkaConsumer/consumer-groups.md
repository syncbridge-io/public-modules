# Consumer groups

A KafkaConsumer reads as a member of the consumer group named by Group id
(`groupId`). Kafka splits the partitions of the topics among the members of
the group, so each message goes to one member.

## Several workers, one group

If two workers run an app with the same Group id and the same topics, the
partitions are shared between them. To have every worker read every message,
give each its own Group id.

## Where reading starts

Mode (`mode`) tells where a consumer starts:

| Mode        | Start                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `latest`    | At the end of each partition: only new messages. Default.                                      |
| `earliest`  | At the first available message.                                                                |
| `committed` | At the last committed offset of the group. Fallback Mode applies when there is none.           |
| `manual`    | The offsets are not set by the stream; see the `@platformatic/kafka` documentation.            |

Fallback Mode (`fallbackMode`) is `latest`, `earliest` or `fail`. It applies when
Mode is `committed` and the group has no committed offset.

## Committing

With Autocommit on (default), offsets are committed as messages are consumed:
a message counts as read even if your handler failed. To commit after your
handler succeeds, turn Autocommit off and call `message.commit()`:

```ts
this.orders.on('message', async message => {
  await this.handle(message);
  await message.commit();
});
```

## Rebalancing

When a member joins or leaves, the group rebalances. A member that sends no
heartbeat within Session timeout is considered down. Heartbeat Interval sets
how often it sends them; keep it well below Session timeout. Group instance id
(`groupInstanceId`) identifies one member across restarts when the broker
supports static membership.

Group Protocol `classic` is the original protocol. `consumer` is the protocol
of KIP-848, with server-side assignment and incremental rebalancing; the
Heartbeat Interval setting does not apply to it.
