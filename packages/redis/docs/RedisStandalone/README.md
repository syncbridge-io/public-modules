# RedisStandalone

Connects to a single Redis server. Use it when an app needs Redis for keys,
queues, pub/sub or streams and the server is reached directly. The component
manages the connection: login, TLS, reconnection and status. The app runs
commands on the [ioredis](https://www.npmjs.com/package/ioredis) client it
exposes. To reach Redis through Sentinel, use
[RedisSentinel](../RedisSentinel/README.md).

The settings, events and communication log common to both Redis components
come from an abstract base component, [Redis](../guides/redis.md). It is not used
on its own.

## Events

| Event          | Arguments | Emitted when                                                  |
| -------------- | --------- | ------------------------------------------------------------- |
| `connect`      |           | The client is ready (connected and logged in).                |
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

- Started: the client is ready. `start()` waits for it.
- Unhealthy: the connection is closed while the component is not stopping. The
  client then connects again by the ioredis retry rules.
- Start fails: when the first connection fails, `start()` rejects, the client
  is disconnected so it does not keep retrying, and the component ends
  stopped.
- Stopped: the client sends `QUIT` and waits until it has ended. A client that
  was still connecting is disconnected. The component can be started again.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { RedisStandaloneComponent } from '@syncbridge/redis';

@App({ description: 'Caches lookups' })
export class CacheApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly redis: RedisStandaloneComponent;

  async lookup(id: string): Promise<string | null> {
    return this.redis.client.get(`item:${id}`);
  }

  async remember(id: string, value: string): Promise<void> {
    await this.redis.client.set(`item:${id}`, value, 'EX', 300);
  }
}
```

## Notes

- The client is created once, when the component is initialized, from the
  settings of that moment. A change made later does not reach the open client.
- A setting left empty is not passed to the client: ioredis applies its own
  default.
- The Events type also declares `data` and `transmit`, inherited from the IO
  client base component. This component never emits them.
