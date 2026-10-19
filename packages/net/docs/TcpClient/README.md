# TcpClient

`TcpClient` opens a TCP connection to a server and keeps it open. When the
connection fails or drops, it connects again after a growing delay, until
the component is stopped. It can wrap the connection in TLS and reach the
server through a SOCKS proxy. Use it for devices and services that expect
your app to connect to them.

It extends [`IoClient`](https://github.com/panates/syncbridge-public-modules/tree/main/packages/builtins/docs/IoClient)
of `@syncbridge/builtins`.

The class is `TcpClientComponent`. Its protocol is `tcp`.

## Settings

Every setting below can change while the worker runs ("Live" = yes). A
change restarts the connection: the component stops, builds a new client
from the new values and starts again. If that fails, its status becomes
`unhealthy` with the error text.

| Variable         | Label          | Description                                                                          | Default | Required | Live |
| ---------------- | -------------- | ------------------------------------------------------------------------------------ | ------- | -------- | ---- |
| `host`           | Host           | Hostname or IP address to be connected to.                                           |         | yes      | yes  |
| `port`           | Port           | Port number of target listener. From 1 to 65535.                                     |         | yes      | yes  |
| `bindInterface`  | Bind Interface | Interface address to bind to. If not specified, binds to all available addresses.    |         | no       | yes  |
| `keepAlive`      | Keep alive     | Enables keep-alive on the TCP socket.                                                | `false` | no       | yes  |
| `connectTimeout` | Connect timeout| Connection timeout in milliseconds.                                                  | `10000` | no       | yes  |
| `reconnect`      | Reconnect      | Reconnect options. See below.                                                        |         | no       | yes  |
| `tls_enabled`    | TLS Enabled    | Wraps the connection in TLS.                                                         |         | no       | yes  |
| `tls`            | TLS            | TLS options. Used when `tls_enabled` is on. See below.                               |         | no       | yes  |
| `proxy_enabled`  | Proxy Enabled  | Connects through a SOCKS proxy.                                                      |         | no       | yes  |
| `proxy`          | Proxy          | Proxy options. Used when `proxy_enabled` is on. See below.                           |         | no       | yes  |

If `host` is empty the component uses `127.0.0.1`. If `port` is empty it
uses `0`.

### Reconnect (`reconnect`)

| Variable       | Label                 | Description                  | Default       | Required | Live |
| -------------- | --------------------- | ---------------------------- | ------------- | -------- | ---- |
| `strategy`     | Reconnection strategy | `exponential` or `fibonacci`. | `exponential` | no       | yes  |
| `initialDelay` | Initial delay         | Initial delay in milliseconds. | `2000`      | no       | yes  |
| `maxDelay`     | Maximum delay         | Maximum delay in milliseconds. | `10000`     | no       | yes  |

The delay of each retry grows from `initialDelay` by the strategy
(doubling, or the Fibonacci sequence) and stops growing at `maxDelay`. A
successful connection resets it. There is no limit on the number of
retries.

### TLS (`tls`)

Values are PEM text. They are passed to Node's `tls.connect()`. See
[TLS and proxies](tls-and-proxies.md).

| Variable             | Label              | Description                                                                                       | Default | Required | Live |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------- | ------- | -------- | ---- |
| `servername`         | SNI                | SNI (Server Name Indication).                                                                     |         | no       | yes  |
| `key`                | Key                | Private keys in PEM format.                                                                       |         | yes      | yes  |
| `cert`               | Cert               | Cert chains in PEM format.                                                                        |         | yes      | yes  |
| `ca`                 | CA certificates    | Overrides the trusted CA certificates. By default the well-known CAs are trusted; giving this replaces them. |  | yes (\*) | yes  |
| `passphrase`         | Passphrase         | Passphrase to decrypt the private key. A secret.                                                  |         | no       | yes  |
| `rejectUnauthorized` | Reject unauthorized| Rejects a connection that is not authorized with the supplied CAs.                                | `true`  | no       | yes  |

(\*) The variable is defined as required, although its description calls it
optional.

### Proxy (`proxy`)

A SOCKS proxy.

| Variable    | Label    | Description                                                    | Default | Required | Live |
| ----------- | -------- | -------------------------------------------------------------- | ------- | -------- | ---- |
| `host`      | Host     | Hostname or IP address of proxy server.                        |         | yes      | yes  |
| `port`      | Port     | Port number of proxy listener. From 1 to 65535.                |         | yes      | yes  |
| `proxyType` | Keep alive (\*) | SOCKS version: `v4` or `v5`.                            | `v5`    | no       | yes  |
| `username`  | Username | Username to be used for authentication.                        |         | no       | yes  |
| `password`  | Username (\*)  | Password for the user name. A secret.                    |         | no       | yes  |

(\*) The labels in the profile editor are those of the code: `proxyType`
shows as "Keep alive" and `password` as "Username".

## Events

| Event          | Arguments                  | Emitted                                                                 |
| -------------- | -------------------------- | ----------------------------------------------------------------------- |
| `connect`      |                            | The connection is up (see Notes), after the status is `started`.         |
| `disconnect`   |                            | The connection ended, by a stop or by a loss.                           |
| `reconnecting` | `n: number, delay: number` | Just before a retry: `n` counts the retries from 0, `delay` is the wait in milliseconds that just passed. |
| `data`         | `data: Buffer, peer`       | Data arrived. `peer` is `{ address, port }`: the configured host and the remote port. |
| `transmit`     | `data: string \| Buffer, peer` | `write()` is about to send data.                                 |
| `error`        | `error: Error`             | A connection attempt failed, or the socket reported an error.            |

`disconnect` carries no error, even when the connection was lost. The
error is logged and becomes the status message.

A refused connection has the message `Connection refused to <address>:<port>`.
A connection that was lost has the message `TCP socket connection lost: ...`.
The `error` event is not emitted for errors during a stop.

## Methods

### `write(data: string | Buffer): void`

Sends data on the socket. It emits `transmit` first. It throws
`Can't write while TCP socket is not connected` when the connection is not
up. Catch it, or check `connected`.

### `connected: boolean`

A getter. `true` while a socket is open.

### `peerAddress: string`

A getter. `host:port` from the settings (`127.0.0.1` and `0` when empty).

## Communication log

The `communication` channel is off by default. Turn it on in the profile's
log settings. The channel takes the events `connect`, `disconnect`, `read`
and `write`.

| When                | `direction` | `event`      | `message`      | `data`   | `details`                            |
| ------------------- | ----------- | ------------ | -------------- | -------- | ------------------------------------ |
| connection is up    | `info`      | `connect`    | `Connected`    |          | `host:port` (from the settings)      |
| connection ends     | `info`      | `disconnect` | `Disconnected` |          | `host:port`                          |
| data arrives        | `in`        | `read`       |                | the data | `host:remotePort`                    |
| `write()` is called | `out`       | `write`      |                | the data | `host:remotePort`                    |

The `disconnect` record never has a reason, because the event carries no
error.

## Status

| Status      | When                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------- |
| `starting`  | The component is starting.                                                                    |
| `unhealthy` | Right after the start, until the first connection. After a loss, with the error as message.   |
| `started`   | A socket connected. It comes back to `started` after each successful reconnect.               |
| `stopped`   | After a stop. The socket is destroyed and the retries end.                                    |

Starting does not wait for the connection: it returns at once, and the
component is `unhealthy` while it connects or retries. An app that needs
the connection waits for `connect` or for `status-change`.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { TcpClientComponent } from '@syncbridge/net';

@App({ displayName: 'Analyzer Reader' })
export class AnalyzerReaderApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly analyzer: TcpClientComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.analyzer.on('connect', () => this.analyzer.write('HELLO\r\n'));
    this.analyzer.on('data', data => {
      // data is a Buffer; a chunk is not always a whole message
      console.log(data.toString());
    });
    this.analyzer.on('reconnecting', (n, delay) =>
      console.log(`retry ${n + 1} after ${delay} ms`),
    );
  }
}
```

TCP is a stream: a `data` event holds a chunk, which may be part of a
message or several. Frame the stream in your app.

## Notes

- A `reconnect` change, like any change of the component's settings,
  restarts the connection.
- `connect` and the status `started` are set when the TCP connection (and
  the proxy handshake) is up. With TLS the handshake is not waited for.
- The retries do not stop by themselves. The component stops them when it is
  stopped.
- With a proxy, `keepAlive` is not applied to the socket. `bindInterface`
  and `connectTimeout` are.
- The client's own default strategy is `fibonacci`. The setting's default is
  `exponential`.
