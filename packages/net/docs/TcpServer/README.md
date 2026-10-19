# TcpServer

`TcpServer` listens on a TCP port and accepts connections. It creates a
Node.js `net.Server` (a `tls.Server` when TLS is on) and gives it to your
app as `server`. The app handles the connections. The component adds what
the app should not repeat: listening, stopping with clients still connected,
TLS and socket options, an IP block list, and a record of each connection's
traffic in the communication log.

It extends
[`IoServer`](https://github.com/panates/syncbridge-public-modules/tree/main/packages/builtins/docs/IoServer)
of `@syncbridge/builtins`. Its class is `TcpServerComponent`.

## Settings

| Variable        | Label          | Description                                                                       | Default | Required | Live |
| --------------- | -------------- | --------------------------------------------------------------------------------- | ------- | -------- | ---- |
| `port`          | Port           | Port number to be listen. From 1 to 65535.                                        |         | yes      | yes  |
| `bindInterface` | Bind Interface | Interface address to bind to. If not specified, binds to all available addresses. |         | no       | yes  |
| `tls_enabled`   | TLS Enabled    | Whether to use TLS for the connection.                                            |         | no       | no   |
| `tls`           | TLS            | TLS options. Used when `tls_enabled` is on. See below.                            |         | no       | no   |
| `socket`        | Socket         | Socket options. See below.                                                        |         | no       | yes  |

"Live" means the engine applies a change to a running worker. The component
reads its settings when it is created, so a change to any of them needs a
restart of the worker to take effect: see Notes.

### Socket (`socket`)

| Variable                | Label                    | Description                                                                                                  | Default | Required | Live |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ | ------- | -------- | ---- |
| `allowHalfOpen`         | Allow Half Open          | Indicates whether half-opened TCP connections are allowed.                                                   | `false` | no       | no   |
| `keepAlive`             | Keep Alive               | Enables keep-alive on the socket of each new incoming connection.                                            | `false` | no       | no   |
| `keepAliveInitialDelay` | Keep Alive Initial Delay | If a positive number, the initial delay before the first keep-alive probe on an idle socket (milliseconds).  | `0`     | no       | no   |
| `noDelay`               | No Delay                 | Disables Nagle's algorithm on the socket of each new incoming connection.                                    | `true`  | no       | yes  |
| `blockedIps`            | Blocked Ips              | A list of blocked IP addresses.                                                                              |         | no       | no   |
| `blockedSubnets`        | Blocked Subnets          | A list of blocked subnet addresses.                                                                          |         | no       | no   |

The block lists compare against the address the server sees. Behind a
reverse proxy or NAT this is the address of the proxy, not the client's.

`blockedIps` entries are an IPv4 or IPv6 address, or an IPv4 range
`first-last`. `blockedSubnets` entries are `address,prefix` or
`address,prefix,ipv6`, split by `,`, `;` or `|`. The prefix is 32 when it is
missing. The type is `ipv4` unless it says `ipv6`.

### TLS (`tls`)

The values are passed to Node's `tls.createServer()`. They are PEM text.

| Variable                 | Label                                | Description                                                                                          | Default  | Required |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------- | -------- |
| `cert`                   | Cert                                 | Cert chains in PEM format: one chain per private key, with intermediate certificates, without the root CA. | | yes      |
| `key`                    | Key                                  | Private keys in PEM format. Encrypted keys are decrypted with `passphrase`.                          |          | yes      |
| `passphrase`             | Passphrase                           | Shared passphrase for a single private key and/or a PFX. A secret.                                   |          | no       |
| `ca`                     | CA certificates                      | Overrides the trusted CA certificates. By default the well-known CAs are trusted. (\*)               |          | yes (\*) |
| `crl`                    | CRL (Certificate Revocation Lists)   | PEM formatted CRLs.                                                                                  |          | no       |
| `rejectUnauthorized`     | Reject unauthorized                  | Rejects a connection that is not authorized with the supplied CAs. Only has an effect when `requestCert` is true. | `true` | no  |
| `handshakeTimeout`       | Headers Timeout (\*\*)               | Aborts the connection if the TLS handshake does not finish in this many milliseconds.                | `120000` | no       |
| `requestCert`            | Request cert                         | Requests a certificate from connecting clients and verifies it.                                      | `false`  | no       |
| `sessionTimeout`         | Session Timeout                      | Seconds after which a TLS session created by the server is no longer resumable.                      |          | no       |
| `allowPartialTrustChain` | Allow Partial Trust Chain            | Treats intermediate (non-self-signed) certificates in the trusted CA list as trusted.                |          | no       |
| `sigalgs`                | Sigalgs                              | Colon-separated list of supported signature algorithms.                                              |          | no       |

(\*) Defined as required, although its description calls it optional.
(\*\*) The label of `handshakeTimeout` in the profile editor.

## Events

| Event      | Arguments                    | Emitted                                                           |
| ---------- | ---------------------------- | ----------------------------------------------------------------- |
| `data`     | `data: Buffer, peer`         | A `data` event was emitted on a connection's socket.              |
| `transmit` | `data: string \| Buffer, peer` | `write()` or `end(data)` was called on a connection's socket.   |
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
import { TcpServerComponent } from '@syncbridge/net';

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

- Settings are read when the component is created: `port`, `bindInterface`,
  the TLS values and the socket options. The component has no handler for a
  change of its values. A live change of `port`, `bindInterface` or
  `noDelay` updates `values` but does not move or reconfigure the running
  server: `port` and `bindInterface` apply at the next start of the
  component, the rest when the worker restarts.
- The `blockedIps` list is replaced when `blockedSubnets` is also set: only
  the subnets are blocked then.
- `blockedSubnets` is also passed to Node as a server option, where it has no
  meaning.
