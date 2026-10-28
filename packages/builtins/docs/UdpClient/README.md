# UdpClient

`UdpClient` sends UDP datagrams and receives the answers. Give it a `host`
and a `port` and it sends to that target and receives only from it
(a "connected" UDP socket). Leave `port` empty and it sends to any host and
port you pass to `write()` and receives from any sender.

It extends
[`IoClient`](../guides/io-client.md)
of `@syncbridge/builtins`. Its class is `UdpClientComponent`, its protocol
is `udp`. To only listen on a port, use
[`UdpListener`](../UdpListener/README.md).

## Changing settings

A change of any setting restarts the component: the socket is closed and a
new one is opened.

## Events

| Event       | Arguments                 | Emitted                                                                 |
| ----------- | ------------------------- | ----------------------------------------------------------------------- |
| `connect`   |                           | The socket is connected to `host:port` (only when `port` is set).       |
| `listening` | `port: number`            | The socket is bound. `port` is the local port.                          |
| `data`      | `data: Buffer, info`      | A datagram arrived. `info` has `address`, `port`, `family`, `size`.     |
| `transmit`  | `data: string \| Buffer, info` | `write()` sent a datagram. `info` has `address`, `port`, `size`.   |
| `error`     | `error: Error`            | The socket reported an error, such as a failed bind.                    |

`info` of both events has a `toString()` that returns `address:port`.

The component also emits `error` when the socket reports an error, such as a
failed bind (`EADDRINUSE`). It never emits `disconnect`.

Datagrams from any address, `127.0.0.1` included, are emitted as `data`.

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
| `unhealthy` | The socket reported an error, with the error text as message.                       |
| `stopped` | After a stop. The socket is closed.                                                   |

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { UdpClientComponent } from '@syncbridge/builtins';

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

- With `bindInterface` set, the socket binds to that interface on a free
  local port, then connects to `host:port` when `port` is set. The local
  port is not the target's port.
- Without `bindInterface` and `port`, the socket binds to a free port when
  it first sends, and receives only after that.
- With `host` and `port` set, the socket is connected: the operating
  system delivers only datagrams from that address to it.
- An error on the socket, such as a failed bind, is logged, emitted as
  `error`, and makes the component `unhealthy`.
