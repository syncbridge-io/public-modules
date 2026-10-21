# IoClient

`IoClient` is an abstract component: the base of every component that
connects to one peer, such as a TCP client, a UDP client, a serial port or
a tunnel. It defines the events and the `write()` method that apps use on
such components, and it writes their traffic to the `communication` log
channel. It has no settings and cannot be added to an app by itself.

The class is `IoClientBaseComponent`. Its registered class name is
`IoClient`, and it is declared `abstract`.

[`IOBridgeApp`](../IOBridgeApp/README.md) types its peers as
`IoClientBaseComponent`, so any component built on it can be bridged.

## Settings

None. `IoClientBaseComponent.Variables` is an empty class
(`IoClientComponentVariables`). A component adds its own variables by
extending it:

```ts
export class MyClientVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({ label: 'Host', required: true })
  declare host: string;
}
```

## Events

Listen with `component.on(event, listener)`.

| Event        | Arguments                         | Emitted                                      |
| ------------ | --------------------------------- | -------------------------------------------- |
| `data`       | `data: Buffer, ...peer`           | By the subclass, when it receives data.      |
| `transmit`   | `data: Buffer, ...peer`           | By the subclass, when it sends data.         |
| `connect`    | none                              | By the subclass, when the connection is up.  |
| `disconnect` | `error?: Error`                   | By the subclass, when the connection ends.   |

The base class declares these events and listens to them. It emits none of
them itself: the subclass does. The `peer` argument is what the subclass
tells about the other side, an object with `address` and `port` or a
string. It is optional.

`error` and the other events of `ComponentBase` are inherited.

## Methods

### `write(data: string | Buffer): void`

The base implementation always throws:

```
"<ClassName>" component do not support write operations.
```

A subclass overrides it. By convention it throws when the component is not
connected and emits `transmit` with the data before it sends.

### `peerAddress: string | undefined`

A getter. It returns what the component connects to, as its connection log
records show it: `host:port`, a serial port path, a tunnel address. It
returns `undefined` in the base class. Override it.

### `protocol: string`

A read-only property, an empty string in the base class. A subclass sets it
(`'tcp'`, `'udp'`).

## Communication log

The component declares a log channel named `communication`
(`communicationLog`, kind `transmit`). The channel is off by default
because traffic grows the logs fast. Its retention is 14 days. Turn it on
in the profile's log settings.

The base class writes these records:

| Trigger                     | `direction` | `event`      | `message`                                       | `data`        | `details`                      |
| --------------------------- | ----------- | ------------ | ----------------------------------------------- | ------------- | ------------------------------ |
| `data` event                | `in`        | `read` (\*)  |                                                 | the data      | `peerOf(peer)`                 |
| `transmit` event            | `out`       | `write` (\*) |                                                 | the data      | `peerOf(peer)`                 |
| `connect` event             | `info`      | `connect`    | `Connected`                                     |               | `peerAddress`                  |
| `disconnect` event          | `info`      | `disconnect` | `Disconnected`, or `Disconnected: <error text>` |               | `peerAddress`                  |

(\*) The channel gives data records the event `read` (direction `in`) or
`write` (direction `out`) when the record names none. Profiles pick records
by event: the channel accepts `connect`, `disconnect`, `read` and `write`.

`peerOf()` turns `{ address, port }` into `address:port`, an address alone
into itself and a string into itself. It returns nothing for anything else.

A component that is created outside an app has no channel. The base class
writes with `this.communicationLog?.`, so it works without one.

## Status

The base class does not start or stop anything. A subclass implements
`_start()` and `_stop()` and sets its status, usually `started` when it is
connected and `unhealthy` when it lost the connection.

## Example

A client of a line-based device, built on `IoClient`:

```ts
import net from 'node:net';
import { IoClientBaseComponent } from '@syncbridge/builtins';
import { Component, ServiceStatus } from '@syncbridge/common';

@Component({ className: 'LineClient', displayName: 'Line Client' })
export class LineClientComponent extends IoClientBaseComponent {
  readonly protocol = 'line';
  protected _socket?: net.Socket;

  @Component.UseVariables()
  declare values: LineClientVariables;

  get peerAddress() {
    return `${this.values.host}:${this.values.port}`;
  }

  protected async _start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect(this.values.port, this.values.host);
      socket.once('error', reject);
      socket.once('connect', () => {
        this._socket = socket;
        socket.on('data', chunk => this.emit('data', chunk));
        socket.once('close', () => {
          this.emit('disconnect');
          this.setStatus(ServiceStatus.unhealthy, 'Connection lost');
        });
        this.emit('connect');
        resolve();
      });
    });
  }

  protected async _stop(): Promise<void> {
    this._socket?.destroy();
  }

  write(data: string | Buffer): void {
    if (!this._socket) throw new Error('Not connected');
    this.emit('transmit', Buffer.from(data));
    this._socket.write(data);
  }
}
```

`LineClientVariables` extends `IoClientBaseComponent.Variables` and
declares `host` and `port`. The base class writes the `connect`,
`disconnect`, `read` and `write` records to the `communication` channel.

## Notes

- The `transmit` listener takes the data as it is given. Emit a `Buffer`
  when you can: the event is typed `Buffer`.
- Emit `transmit` before the write, so a failed write still shows in the
  log. `TcpClient` does it in this order.
