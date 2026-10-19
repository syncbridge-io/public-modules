# UdpListener

`UdpListener` binds a UDP port and emits every datagram that arrives there.
It can enable broadcast and join multicast groups. Use it for devices that
announce themselves or send readings to a port, such as discovery
broadcasts and multicast feeds. To send to a fixed target, use
[`UdpClient`](../UdpClient/README.md).

It extends
[`IoClient`](https://github.com/panates/syncbridge-public-modules/tree/main/packages/builtins/docs/IoClient)
of `@syncbridge/builtins`. Its class is `UdpListenerComponent`, its
protocol is `udp`.

## Settings

| Variable             | Label              | Description                                                                                                         | Default | Required | Live |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------- | -------- | ---- |
| `port`               | Port               | Port number to bind. The description reads "of target listener". From 1 to 65535.                                   |         | yes      | yes  |
| `broadcast`          | Broadcast          | Sets the SO_BROADCAST socket option. When true, packets may be sent to a local interface's broadcast address.       |         | no       | yes  |
| `multicastGroups`    | Multicast Groups   | Multicast groups to be joined (a list).                                                                             |         | no       | yes  |
| `bindInterface`      | Bind Interface     | Interface address to bind to. If not specified, binds to `0.0.0.0`.                                                  |         | no       | yes  |
| `multicastInterface` | Multicast Interface| Interface address to bind for multicast packages.                                                                   |         | no       | yes  |

A change of any setting restarts the component.

## Events

| Event       | Arguments                      | Emitted                                                             |
| ----------- | ------------------------------ | ------------------------------------------------------------------- |
| `listening` | `port: number`                 | The socket is bound.                                                |
| `data`      | `data: Buffer, info`           | A datagram arrived. `info` has `address`, `port`, `family`, `size`. |
| `transmit`  | `data: string \| Buffer, info` | `write()` sent a datagram. `info` has `address`, `port`, `size`.    |

`info` of both events has a `toString()` that returns `address:port`.

The component never emits `connect` or `disconnect`. The `write` event in
its typed event list is never emitted.

Datagrams from `127.0.0.1` are ignored: the component does not emit `data`
for them.

## Methods

### `write(data: string | Buffer, port?: number, host?: string): void`

Sends a datagram from the listening socket, for example an answer to the
sender of a `data` event. `host` is required: the method throws
`You must provide "host" variable to send message over UDP socket` without
it. `port` defaults to the setting `port`. It emits `transmit` after the
send call.

## Communication log

The `communication` channel is off by default. It takes the events
`connect`, `disconnect`, `read` and `write`.

| When             | `direction` | `event` | `data`   | `details`                    |
| ---------------- | ----------- | ------- | -------- | ---------------------------- |
| datagram arrives | `in`        | `read`  | the data | `address:port` of the sender |
| `write()` sends  | `out`       | `write` | the data | `address:port` of the target |

The component writes no `connect` or `disconnect` records.

## Status

| Status    | When                                    |
| --------- | --------------------------------------- |
| `started` | After the socket is bound and set up.   |
| `stopped` | After a stop. The socket is closed.     |

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { UdpListenerComponent } from '@syncbridge/net';

@App({ displayName: 'Beacon Reader' })
export class BeaconReaderApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly beacons: UdpListenerComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.beacons.on('data', (data, info) => {
      console.log(`beacon from ${info.address}:${info.port}`, data.toString());
      this.beacons.write('ACK', info.port, info.address);
    });
  }
}
```

## Notes

- The component joins the multicast groups and sets broadcast once the
  socket is bound.
- The socket has no `error` listener in the component. An error on the
  socket, such as a failed bind, is not handled by it.
- The listener ignores datagrams from the local machine's `127.0.0.1`, so
  it cannot be tested with a sender on the same host over loopback.
