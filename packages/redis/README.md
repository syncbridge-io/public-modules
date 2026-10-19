# @syncbridge/redis

Redis client components for SyncBridge, built on
[ioredis](https://www.npmjs.com/package/ioredis). A component manages the
connection (login, TLS, reconnection, status) and gives the app the ioredis
client to run commands with.

## Components

| Component       | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| RedisStandalone | Connects to a single Redis server.                             |
| RedisSentinel   | Asks Redis Sentinel for the master and connects to it.         |

## Install

SyncBridge servers install modules from the Marketplace or from Console.

The module is also on npm:

```bash
npm install @syncbridge/redis
```

Peer dependencies: `@syncbridge/common`, `@syncbridge/builtins`,
`@syncbridge/net`, `@jsopen/objects` and `ioredis`. The engine provides the
`@syncbridge/*` packages. When you use the module outside the engine, install
all of them yourself, including `@jsopen/objects` and `ioredis`.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { RedisStandaloneComponent } from '@syncbridge/redis';

@App({ description: 'Counts calls' })
export class CounterApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly redis: RedisStandaloneComponent;

  async count(): Promise<number> {
    return this.redis.client.incr('calls');
  }
}
```

## Documentation

https://github.com/panates/syncbridge-public-modules/tree/main/packages/redis/docs
