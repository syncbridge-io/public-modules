---
title: Redis, the base of the Redis components
order: 1
---

# Redis

The abstract base of the Redis components. It is not used on its own: an app
uses [RedisStandalone](../RedisStandalone/README.md) for a single server or
[RedisSentinel](../RedisSentinel/README.md) behind Sentinel. This page is for
a developer who builds a Redis component of their own, for example for a
cluster.

## What it gives

- The settings common to the Redis components: database, auto resubscribe,
  keep alive, no delay, connection name, retry and timeout limits, and TLS.
  They are in the Settings tables of the two components.
- The `connect`, `disconnect` and `reconnecting` events.
- The `communication` log channel, which records those three events. A
  component that extends it emits the events when its client does, and the
  records are written without more code.
- The `connection` dashboard, filled from the same events.
- The `client` getter, which a component overrides to return its ioredis
  client. The base one throws `Not implemented`.

## Communication log

| Event          | Message                                         |
| -------------- | ----------------------------------------------- |
| `connect`      | `Connected`                                     |
| `disconnect`   | `Disconnected`, or `Disconnected: <error text>` |
| `reconnecting` | `Connecting again`                              |

The channel is off by default. Every record has `direction` `info`.

## Dashboard

The base class gives every Redis component a dashboard, `connection`
(`RedisDashboard`), filled from its events. A component's widgets are not
a tab of their own: an app shows those it takes with `include`, and the
others are not written at all.

| Widget     | Id           | Shows                                                                 |
| ---------- | ------------ | --------------------------------------------------------------------- |
| Redis      | `link`       | `Not connected` at first; `Connected`; `Connecting again` (a warning); `Disconnected` (a warning) or `Disconnected: <error>` (an error). |
| Reconnects | `reconnects` | The `reconnecting` events since the worker started.                   |

The commands an app runs go straight to the ioredis client, so they are
not counted.

```ts
@App({ displayName: 'Cache' })
export class CacheApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly redis: RedisStandaloneComponent;

  @UseDashboard({ title: 'Redis', include: [{ component: 'redis' }] })
  declare readonly redisTab: DashboardBase;
}
```

## Building on it

A component extends `RedisComponent`, creates its ioredis client, forwards the
client's `ready`, `close` and `reconnecting` events as `connect`, `disconnect`
and `reconnecting`, and returns the client from `client`. The two Redis
components of this module are the examples:

- `redis-standalone.component.ts` connects to one server.
- `redis-sentinel.component.ts` asks Sentinel for the master first.

When it stops, a component should wait until the client has ended, so that it
can be started again.
