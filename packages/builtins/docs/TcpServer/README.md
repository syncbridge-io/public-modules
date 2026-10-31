# TcpServer

`TcpServer` listens on a TCP port and accepts connections. It creates a
Node.js `net.Server` (a `tls.Server` when TLS is on) and gives it to your
app as `server`. The app handles the connections. The component adds what
the app should not repeat: listening, stopping with clients still connected,
TLS and socket options, an IP block list, and a record of each connection's
traffic in the communication log.

It extends
[`IoServer`](../guides/io-server.md)
of `@syncbridge/builtins`. Its class is `TcpServerComponent`.

## Changing settings

No setting is live: a change of any of them restarts the worker.

## Blocked addresses

The block lists compare against the address the server sees. Behind a
reverse proxy or NAT this is the address of the proxy, not the client's.

`blockedIps` entries are an IPv4 or IPv6 address, or an IPv4 range
`first-last`. `blockedSubnets` entries are `address,prefix` or
`address,prefix,ipv6`, split by `,`, `;` or `|`. The prefix is 32 for an IPv4
subnet and 128 for an IPv6 one when it is missing. The type is `ipv4` unless
it says `ipv6`. Both lists apply: an address is refused when it is in
`blockedIps` or in a subnet of `blockedSubnets`.

The TLS values are PEM text, passed to Node's `tls.createServer()`.

## Events

| Event      | Arguments                    | Emitted                                                           |
| ---------- | ---------------------------- | ----------------------------------------------------------------- |
| `data`     | `data: Buffer, peer`         | A `data` event was emitted on a connection's socket.              |
| `transmit` | `data: string \| Buffer, peer` | `write()` or `end(data)` was called on a connection's socket.   |
| `connect`    | `peer`                     | A connection was accepted.                                        |
| `disconnect` | `peer`                     | A connection closed.                                              |
| `error`    | `error: Error`               | Inherited.                                                        |

`peer` is `{ address, port }` of the connection's remote end.

The component does not read the sockets and does not write to them for you.
It watches the sockets the server accepts: it wraps each socket's `emit`,
`write` and `end` so the app's own use is reported, without adding a
listener. A socket that the app reads late or pauses loses nothing. If the
app never reads a socket, there is no `data` event.

## Server and sockets

`server` is the Node.js server. Handle connections on it:

- Without TLS: the `connection` event.
- With TLS: the `secureConnection` event. The component watches this event
  for traffic. A `connection` listener on a TLS server gets the raw socket,
  before the handshake.

The server is created in `_init()`, so `server` exists once the component is
initialized. It has no `write()`: calling `write()` on the component throws
`"TcpServerComponent" component do not support write operations.` Write to
the socket of the connection.

## Communication log

The `communication` channel is off by default. It takes the events
`connect`, `disconnect`, `read` and `write`.

| When                                  | `direction` | `event`      | `message`      | `data`   | `details`            |
| ------------------------------------- | ----------- | ------------ | -------------- | -------- | -------------------- |
| a connection is accepted              | `info`      | `connect`    | `Connected`    |          | `address:port`       |
| a connection's socket emits `data`    | `in`        | `read`       |                | the data | `address:port`       |
| `write()` or `end(data)` on a socket  | `out`       | `write`      |                | the data | `address:port`       |
| a connection closes                   | `info`      | `disconnect` | `Disconnected` |          | `address:port`       |

`address` can be an IPv4-mapped IPv6 form such as `::ffff:127.0.0.1`.

## Dashboard

Its `connections` dashboard shows how many connections are open, a chart of bytes a second, and a row for each - its peer, since when, bytes received and sent - where an app takes it: see [IoServer](../guides/io-server.md#dashboard).

## Status

| Status     | When                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| `started`  | The server is listening.                                                          |
| `stopped`  | After a stop. The sockets are destroyed and the server is closed.                 |

The start fails, and its error is reported, when the server cannot listen
(for example, the port is in use).

A stop destroys the connected sockets, as the server waits for them
otherwise.

## Example

```ts
import net from 'node:net';
import { App, AppBase } from '@syncbridge/common';
import { TcpServerComponent } from '@syncbridge/builtins';

@App({ displayName: 'Shout' })
export class ShoutApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly listener: TcpServerComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.listener.server.on('connection', (socket: net.Socket) => {
      socket.on('data', data => socket.write(data.toString().toUpperCase()));
    });
  }
}
```

With `tls_enabled` on, listen to `secureConnection` instead of
`connection`.

## Notes

- The component reads its settings when it is created: `port`,
  `bindInterface`, the TLS values and the socket options. None of them is
  live, so a change of any setting restarts the worker.
- `blockedSubnets` is not passed to Node as a server option. The component
  builds one block list from `blockedIps` and `blockedSubnets`.
