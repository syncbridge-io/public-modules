# UdpClient

`UdpClient` sends UDP datagrams and receives the answers. Give it a `host`
and a `port` and it sends to that target and receives only from it
(a "connected" UDP socket). Leave `port` empty and it sends to any host and
port you pass to `write()` and receives from any sender.

It extends
[`IoClient`](https://github.com/panates/syncbridge-public-modules/tree/main/packages/builtins/docs/IoClient)
of `@syncbridge/builtins`. Its class is `UdpClientComponent`, its protocol
is `udp`. To only listen on a port, use
[`UdpListener`](../UdpListener/README.md).

## Settings

| Variable        | Label          | Description                                                                       | Default | Required | Live |
| --------------- | -------------- | --------------------------------------------------------------------------------- | ------- | -------- | ---- |
| `host`          | Host           | Hostname or IP address which udp messages will send to.                           |         | no       | yes  |
| `port`          | Port           | Port number of target listener. From 1 to 65535.                                  |         | no       | yes  |
| `bindInterface` | Bind Interface | Interface address to bind to. If not specified, binds to all available addresses. |         | no       | yes  |

A change of any setting restarts the component: the socket is closed and a
new one is opened.

## Events

| Event       | Arguments                 | Emitted                                                                 |
| ----------- | ------------------------- | ----------------------------------------------------------------------- |
| `connect`   |                           | The socket is connected to `host:port` (only when `port` is set).       |
| `listening` | `port: number`            | The socket is bound. `port` is the local port.                          |
| `data`      | `data: Buffer, info`      | A datagram arrived. `info` has `address`, `port`, `family`, `size`.     |
| `transmit`  | `data: string \| Buffer, info` | `write()` sent a datagram. `info` has `address`, `port`, `size`.   |

`info` of both events has a `toString()` that returns `address:port`.

The component never emits `disconnect`. The `write` event in its typed event
list is never emitted.

Datagrams from `127.0.0.1` are ignored: the component does not emit `data`
for them.

## Methods

### `write(data: string | Buffer, port?: number, host?: string): void`

Sends a datagram. `host` and `port` default to the settings. It throws
`You must provide "host" variable to send message over UDP socket` when
there is no host. It emits `transmit` after the send call.

The socket is created when the component starts. Call `write()` after
that.

Set `socket.setBroadcast(true)` on the component's `socket` to send to a
broadcast address. The component's `socket` has an extra read-only
`isBroadcastEnabled` that follows `setBroadcast` calls.

## Communication log

The `communication` channel is off by default. It takes the events
`connect`, `disconnect`, `read` and `write`.

| When              | `direction` | `event`   | `message`   | `data`   | `details`                          |
| ----------------- | ----------- | --------- | ----------- | -------- | ---------------------------------- |
| `connect` emitted | `info`      | `connect` | `Connected` |          | `host:port`                        |
| datagram arrives  | `in`        | `read`    |             | the data | `address:port` of the sender       |
| `write()` sends   | `out`       | `write`   |             | the data | `address:port` of the target       |

The component writes no `disconnect` record.

## Status

| Status    | When                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| `started` | Without `port`: at once when started. With `port`: when the socket is connected or bound. |
| `stopped` | After a stop. The socket is closed.                                                   |

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { UdpClientComponent } from '@syncbridge/net';

@App({ displayName: 'Discovery' })
export class DiscoveryApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly udp: UdpClientComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.udp.on('data', (data, info) =>
      console.log(`${info.address}: ${data.toString()}`),
    );
    this.udp.on('listening', () => this.udp.write('WHO IS THERE', 9999, '192.168.1.255'));
  }
}
```

## Notes

- With `bindInterface` set, the socket binds to that interface on the local
  port `port` (a free port if `port` is empty), then connects to
  `host:port` when `port` is set. The local port is the target's port.
- Without `bindInterface` and `port`, the socket binds to a free port when
  it first sends, and receives only after that.
- With `host` and `port` set, the socket is connected: the operating
  system delivers only datagrams from that address to it.
- The socket has no `error` listener in the component. An error on the
  socket, such as a failed bind, is not handled by it.
