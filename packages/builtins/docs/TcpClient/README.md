# TcpClient

`TcpClient` opens a TCP connection to a server and keeps it open. When the
connection fails or drops, it connects again after a growing delay, until
the component is stopped. It can wrap the connection in TLS and reach the
server through a SOCKS proxy. Use it for devices and services that expect
your app to connect to them.

It extends [`IoClient`](../guides/io-client.md)
of `@syncbridge/builtins`.

The class is `TcpClientComponent`. Its protocol is `tcp`.

## Changing settings

Every setting can change while the worker runs. A change restarts the
connection: the component stops, builds a new client from the new values
and starts again. If that fails, its status becomes `unhealthy` with the
error text.

If `host` is empty the component uses `127.0.0.1`. If `port` is empty it
uses `0`.

The delay of each reconnect retry grows from `initialDelay` by the strategy
(doubling, or the Fibonacci sequence) and stops growing at `maxDelay`. A
successful connection resets it. There is no limit on the number of
retries. TLS values are PEM text, passed to Node's `tls.connect()`; see
[TLS and proxies](tls-and-proxies.md).

## Events

| Event          | Arguments                  | Emitted                                                                 |
| -------------- | -------------------------- | ----------------------------------------------------------------------- |
| `connect`      |                            | The connection is up (with TLS, after the handshake), after the status is `started`. |
| `disconnect`   | `error?: Error`            | The connection ended. After a loss `error` is set; after a stop it is not. |
| `reconnecting` | `n: number, delay: number` | Just before a retry: `n` counts the retries from 0, `delay` is the wait in milliseconds that just passed. |
| `data`         | `data: Buffer, peer`       | Data arrived. `peer` is `{ address, port }`: the configured host and the remote port. |
| `transmit`     | `data: string \| Buffer, peer` | `write()` is about to send data.                                 |
| `error`        | `error: Error`             | A connection attempt failed, or the socket reported an error.            |

After a loss, `disconnect` carries the error. It is also logged and
becomes the status message.

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
| connection ends     | `info`      | `disconnect` | `Disconnected` after a stop, `Disconnected: <reason>` after a loss |          | `host:port`                          |
| data arrives        | `in`        | `read`       |                | the data | `host:remotePort`                    |
| `write()` is called | `out`       | `write`      |                | the data | `host:remotePort`                    |

The reason of a `disconnect` record is the message of the error the event
carries.

## Dashboard

The **Connection** tab shows the link to `host:port` and the bytes received and sent: see [IoClient](../guides/io-client.md#dashboard).

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
import { TcpClientComponent } from '@syncbridge/builtins';

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
  the proxy handshake) is up. With TLS they wait for the TLS handshake. A
  failed handshake is a connection failure: the component emits `error`
  and retries.
- The retries do not stop by themselves. The component stops them when it is
  stopped.
- With a proxy, `keepAlive` is not applied to the socket. `bindInterface`
  and `connectTimeout` are.
- The client's own default strategy is `fibonacci`. The setting's default is
  `exponential`.
