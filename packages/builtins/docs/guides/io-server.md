---
title: IoServer, the base of server components
order: 3
---

# IoServer

`IoServer` is an abstract component: the base of components that accept
connections from many peers, such as a TCP server or an HTTP server. It
defines the `data` and `transmit` events and writes them to the
`communication` log channel. It has no settings and cannot be added to an
app by itself.

The class is `IoServerBaseComponent`. Its registered class name is
`IoServer`, and it is declared `abstract`.

It differs from [`IoClient`](io-client.md) in two ways. It has no
`connect` and `disconnect` events and no `peerAddress`, because it has many
peers. Each event carries the peer it is about instead.

## Variables

None of its own. `IoServerBaseComponent.Variables` is an empty class
(`IoServerComponentVariables`). A component adds its own variables by
extending it.

## Events

| Event      | Arguments               | Emitted                                 |
| ---------- | ----------------------- | --------------------------------------- |
| `data`     | `data: Buffer, ...peer` | By the subclass, when it receives data. |
| `transmit` | `data: Buffer, ...peer` | By the subclass, when it sends data.    |

The base class listens to these events and emits none of them. The `peer`
argument is the peer the data came from or went to: an object with
`address` and `port`, or a string.

## Methods

### `write(data: string | Buffer): void`

The base implementation always throws:

```
"<ClassName>" component do not support write operations.
```

A server has many peers, so a subclass that wants a `write()` decides whom
it writes to. `TcpServer` and `HttpServer` do not override it: apps write
to a connection's socket or response instead.

### `protocol: string`

A read-only property, an empty string in the base class.

## Communication log

The component declares the `communication` log channel (kind `transmit`,
off by default, retention 14 days). The base class writes two records:

| Trigger          | `direction` | `event` (\*) | `data`   | `details`      |
| ---------------- | ----------- | ------------ | -------- | -------------- |
| `data` event     | `in`        | `read`       | the data | `peerOf(peer)` |
| `transmit` event | `out`       | `write`      | the data | `peerOf(peer)` |

(\*) The channel sets the event from the direction when the record names
none. The channel accepts the events `connect`, `disconnect`, `read` and
`write`. The base class does not write `connect` and `disconnect` records:
a subclass writes them itself, as `TcpServer` does.

Without a channel (a component created outside an app) nothing is written.

## Status

The base class does not start or stop anything. A subclass implements
`_start()` and `_stop()`.

## Example

A server that echoes in upper case, built on `IoServer`:

```ts
import net from 'node:net';
import { IoServerBaseComponent, peerOf } from '@syncbridge/builtins';
import { Component } from '@syncbridge/common';

@Component({ className: 'ShoutServer', displayName: 'Shout Server' })
export class ShoutServerComponent extends IoServerBaseComponent {
  readonly protocol = 'shout';
  protected _server!: net.Server;

  @Component.UseVariables()
  declare values: ShoutServerVariables;

  protected async _init(): Promise<void> {
    await super._init();
    this._server = net.createServer(socket => {
      const peer = { address: socket.remoteAddress, port: socket.remotePort };
      socket.on('data', chunk => {
        this.emit('data', chunk, peer);
        const answer = Buffer.from(chunk.toString().toUpperCase());
        this.emit('transmit', answer, peer);
        socket.write(answer);
      });
    });
  }

  protected async _start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._server.once('error', reject);
      this._server.listen(this.values.port, resolve);
    });
  }

  protected async _stop(): Promise<void> {
    await new Promise<void>(resolve => this._server.close(() => resolve()));
  }
}
```

`ShoutServerVariables` extends `IoServerBaseComponent.Variables` and
declares `port`.
