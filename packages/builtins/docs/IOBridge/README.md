# IOBridge

`IOBridge` connects two IO peers: what one peer reads, it writes to the
other. Use it to join two devices or two networks that speak the same
bytes, for example a serial port and a TCP socket, or a TCP client and a UDP
client.

The app is registered as `IOBridge`; its class in code is `IOBridgeApp`.
Versions before 2.1 registered it as `IOBridgeApp`: workers set up with that
name are carried over to the new one.

## Components

| Component | Type                                | Required | Description                         |
| --------- | ----------------------------------- | -------- | ----------------------------------- |
| `peer1`   | any [`IoClient`](../guides/io-client.md) | yes      | The first peer.                     |
| `peer2`   | any [`IoClient`](../guides/io-client.md) | yes      | The second peer.                    |

Choose each peer's component in the profile: any component built on
`IoClient` fits, for example `TcpClient`, `UdpClient`, `UdpListener` or a
serial port. The peers are typed `IoClient`: an `IoServer` component is not
meant for them, as its `write()` always throws.

## Behavior

The app listens to the `data` event of both peers:

- `peer1` emits `data`: the app calls `peer2.write(data)`.
- `peer2` emits `data`: the app calls `peer1.write(data)`.

The data is passed as it is, without framing, buffering or conversion.

When a write throws (for example the other peer is not connected), the app
adds the failure to the error message and emits `error` on itself:

```
Failed to write data to peer2: Can't write while TCP socket is not connected
```

The data that failed is dropped. The app does not queue it.

## Events

The app emits `error` only, for the write failures above. The engine logs
it.

## Communication log

The app writes no log records of its own. Each peer writes its traffic to
its own `communication` channel when that channel is on.

## Dashboard

The app has one tab, **Bridge** (`IOBridgeDashboard`, the `bridge`
property). Its own widgets are in the **Bridge** section:

| Widget     | Id          | Shows                                                                 |
| ---------- | ----------- | --------------------------------------------------------------------- |
| Forwarded  | `forwarded` | Bytes a second passed on each way, `toPeer2` (shown as Peer 1 → Peer 2) and `toPeer1`, a chart of the last 200 seconds. |
| Dropped    | `dropped`   | Bytes dropped since the worker started, as their write failed; a warning from the first. |
| Last error | `lastError` | `No errors`, or the last write failure's message.                     |

Beside them, in the sections **Peer 1** and **Peer 2**, are the peers'
own widgets - their link, the bytes they received and sent, their traffic
(see [IoClient](../guides/io-client.md#dashboard)). They are the
components', and the app takes them with `include`, each into its own
section, so the two links are told apart:

```ts
@DashboardSections([
  { id: 'bridge', title: 'Bridge' },
  { id: 'peer1', title: 'Peer 1' },
  { id: 'peer2', title: 'Peer 2' },
])
export class IOBridgeDashboard extends DashboardBase {
  @Widget.Chart({ title: 'Forwarded', section: 'bridge',
    series: ['toPeer2', 'toPeer1'], unit: 'B/s',
    labels: { toPeer2: 'Peer 1 → Peer 2', toPeer1: 'Peer 2 → Peer 1' } })
  declare readonly forwarded: Widget.Chart;
  // ...
}

export class IOBridgeApp extends AppBase {
  @UseDashboard({
    title: 'Bridge',
    include: [
      { component: 'peer1', section: 'peer1' },
      { component: 'peer2', section: 'peer2' },
    ],
  })
  declare readonly bridge: IOBridgeDashboard;
}

// a write that went through
this.bridge?.forwarded.count('toPeer2', data.length);
```

The forwarded bytes are counted with `count()`: summed in the worker and
written as one point a second, however busy the bridge is.

## Status

The app has the status of its components. It is started when both peers are
started, and unhealthy when one is unhealthy (for example a client that lost
its connection and is reconnecting).

## Example

The app is configured in a profile: choose a component for `peer1` and one
for `peer2`. The app's own code is this short. A simplified version of it follows, a good model for an app
that works on components:

```ts
import { App, AppBase } from '@syncbridge/common';
import { IoClientBaseComponent } from '@syncbridge/builtins';

@App({ description: 'Bridge two IO peers' })
export class MyBridgeApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly peer1: IoClientBaseComponent;

  @App.UseComponent({ required: true })
  declare readonly peer2: IoClientBaseComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.peer1.on('data', (data: Buffer) => this.peer2.write(data));
    this.peer2.on('data', (data: Buffer) => this.peer1.write(data));
  }
}
```

## Notes

- A peer whose `write()` is not supported (the base `IoClient`) throws on
  the first data, and the app reports it as an error each time.
- The app does not stop a loop: two peers that echo each other keep passing
  the same data back and forth.
