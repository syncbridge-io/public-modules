# RedisSentinel

Connects to the master of a Redis group through Redis Sentinel. Use it when
Redis runs with Sentinel and the master can change. The component asks the
sentinels for the master of the named group, connects to it, and asks again
when the connection is lost. The app runs commands on the
[ioredis](https://www.npmjs.com/package/ioredis) client it exposes. For a
single server, use [RedisStandalone](../RedisStandalone/README.md).

The settings, events and communication log common to both Redis components
come from an abstract base component, [Redis](../Redis/README.md). It is not used
on its own.

## Settings

| Setting                          | Key                             | Description                                                                                                                                | Default | Required |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- |
| Name                             | `name`                          | Master group name of the Sentinel.                                                                                                         |         | Yes      |
| Sentinels                        | `sentinels`                     | The sentinels to connect to: a list of host and port. See below.                                                                           |         | Yes      |
| Username                         | `username`                      | If set, the client sends `AUTH` with it as the first argument when connected. Supported since Redis 6.                                     |         | No       |
| Password (secret)                | `password`                      | If set, the client sends `AUTH` with it when connected.                                                                                    |         | No       |
| Sentinel TLS Enabled             | `sentinelTls_enabled`           | Use TLS for the connections to the sentinels.                                                                                              | false   | No       |
| Sentinel TLS                     | `sentinelTls`                   | Sentinel TLS options, used when Sentinel TLS is enabled. Same fields as TLS below.                                                         |         | No       |
| Database                         | `db`                            | Database index to use.                                                                                                                     |         | No       |
| Auto Resubscribe                 | `autoResubscribe`               | When the client reconnects, channels subscribed in the previous connection are subscribed again.                                            |         | No       |
| Auto Resend Unfulfilled Commands | `autoResendUnfulfilledCommands` | Resend unfulfilled commands on reconnect. They are most likely blocking commands such as `brpop` or `blpop`.                               |         | No       |
| Keep alive                       | `keepAlive`                     | Keep-alive on the TCP socket. The value is a number (the initial delay in milliseconds in ioredis).                                        |         | No       |
| No Delay                         | `noDelay`                       | Enable or disable Nagle's algorithm.                                                                                                       |         | No       |
| Connection Name                  | `connectionName`                | Name of the connection, to find it in the client list of Redis.                                                                            |         | No       |
| Max Retries Per Request          | `maxRetriesPerRequest`          | Reconnection attempts allowed before commands that got no reply are flushed with a `MaxRetriesPerRequestError`. `-1` waits without limit.   |         | No       |
| Command Timeout                  | `commandTimeout`                | Milliseconds to wait for a reply before a `Command timed out` error is thrown.                                                             |         | No       |
| Disconnect Timeout               | `disconnectTimeout`             | Maximum time in milliseconds to wait for the connection to close.                                                                          |         | No       |
| TLS Enabled                      | `tls_enabled`                   | Use TLS for the connection to the master.                                                                                                  | false   | No       |
| TLS                              | `tls`                           | TLS options for the master, used when TLS is enabled. See below.                                                                           |         | No       |

Where no default is shown, the setting is not passed unless set and ioredis
applies its own default.

### Sentinels

| Setting | Key    | Description                           | Default | Required |
| ------- | ------ | ------------------------------------- | ------- | -------- |
| Host    | `host` | Hostname or IP address of the sentinel. |       | Yes      |
| Port    | `port` | Port number of the sentinel (1-65535). |        | Yes      |

### TLS and Sentinel TLS

| Setting              | Key                  | Description                                                                                          | Default | Required |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- | ------- | -------- |
| SNI                  | `servername`         | Server Name Indication.                                                                              |         | No       |
| Key                  | `key`                | Private key in PEM format.                                                                           |         | Yes      |
| Cert                 | `cert`               | Certificate chain in PEM format.                                                                     |         | Yes      |
| CA certificates      | `ca`                 | Overrides the trusted CA certificates. Mozilla's well-known CAs are replaced when it is set.         |         | Yes      |
| Passphrase (secret)  | `passphrase`         | Passphrase to decrypt the private key.                                                               |         | No       |
| Reject unauthorized  | `rejectUnauthorized` | Reject a connection to a server not authorized by the supplied CAs.                                  | true    | No       |

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
- The Password and Username settings are sent to the master. The settings for
  authenticating to the sentinels themselves are not exposed.
