# RedisSentinel

Connects to the master of a Redis group through Redis Sentinel. Use it when
Redis runs with Sentinel and the master can change. The component asks the
sentinels for the master of the named group, connects to it, and asks again
when the connection is lost. The app runs commands on the
[ioredis](https://www.npmjs.com/package/ioredis) client it exposes. For a
single server, use [RedisStandalone](../RedisStandalone/README.md).

The settings, events and communication log common to both Redis components
come from an abstract base component, [Redis](../guides/redis.md). It is not used
on its own.

## Events

| Event          | Arguments | Emitted when                                                  |
| -------------- | --------- | ------------------------------------------------------------- |
| `connect`      |           | The client is ready (connected to the master and logged in).  |
| `disconnect`   | `error?`  | The connection is closed, including when the component stops. |
| `reconnecting` |           | The client is connecting again.                               |

Errors of the client are written to the component's logger. They are not
emitted as events.

## Methods

- `client` returns the ioredis client. Run commands on it:
  `await component.client.get('key')`. It throws `Not initialized yet.` before
  the component is initialized. The same client is used after a stop and a
  start.

## Communication log

The `communication` channel is off by default; turn it on in the profile's log
settings. It records the connection, not the commands. Every record has
`direction` `info`.

| Event          | Message                                          | Written when                          |
| -------------- | ------------------------------------------------ | ------------------------------------- |
| `connect`      | `Connected`                                      | The client is ready.                  |
| `disconnect`   | `Disconnected`, or `Disconnected: <error text>`  | The connection is closed.             |
| `reconnecting` | `Connecting again`                               | The client is connecting again.       |

## Status

- Started: the client is ready, connected to the master the sentinel named.
- Unhealthy: the connection is closed while the component is not stopping.
- Start fails: when the first connection fails, `start()` rejects, the client
  is disconnected so it does not keep retrying, and the component ends
  stopped.
- Stopped: the client sends `QUIT` and waits until it has ended. The component
  can be started again.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { RedisSentinelComponent } from '@syncbridge/redis';

@App({ description: 'Publishes events' })
export class EventsApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly redis: RedisSentinelComponent;

  async publish(channel: string, text: string): Promise<void> {
    await this.redis.client.publish(channel, text);
  }
}
```

## Notes

- The client is created once, when the component is initialized, from the
  settings of that moment. A change made later does not reach the open client.
- A setting left empty is not passed to the client: ioredis applies its own
  default.
- The Password and Username settings are sent to the master; Sentinel
  Password and Sentinel Username to the sentinels, which may require their
  own.
