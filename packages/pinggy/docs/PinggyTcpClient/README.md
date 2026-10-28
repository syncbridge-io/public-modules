# PinggyTcpClient

`PinggyTcpClient` makes a TCP service of an app reachable from the internet
through [Pinggy](https://pinggy.io). Use it when a remote device or system
must connect to the server but the server has no public address.

## How it works

1. The component opens a TCP server on `127.0.0.1`, on the `localPort`
   setting or a free port.
2. It starts a Pinggy tunnel to that port with the Pinggy SDK
   (`@pinggy/pinggy`), forwarding `tcp://localhost:<port>`. Pinggy gives the
   tunnel one or more public addresses. The component's `peerAddress` is
   `tcp://` followed by those addresses, separated by commas, once the
   tunnel is open.
3. A remote peer connects to a public address. Pinggy passes the
   connection to the local server.
4. The component emits what arrives as `data` events and sends what the app
   passes to `write()`.

The component uses the most recent connection: when a new one arrives, the
earlier one is no longer read or written to. Earlier connections stay open.
To get the address, read `peerAddress`, or find it in the component's log
(`Tunnel started: ...`).

The component asks the SDK to reconnect on its own, every 5 seconds, with
no limit on the attempts.

## The auth token

The tunnel needs a Pinggy token. Create one in the Pinggy dashboard under
[managetokens](https://dashboard.pinggy.io/managetokens) and put it in the
`authToken` setting. The token is a secret: keep it out of source control
and out of logs. TCP tunnels are not available on every Pinggy plan; the
Pinggy documentation lists the requirements.

## Changing settings

Both settings can be changed while the component runs. A change restarts
the component, which opens a new tunnel.

## Events

| Event          | Arguments        | When                                                                        |
| -------------- | ---------------- | --------------------------------------------------------------------------- |
| `connect`      |                  | The tunnel is open, and again when its status becomes `live` after it was `closed` |
| `disconnect`   | `error?: Error`  | The tunnel's status becomes `closed`. Carries an error unless the component is stopping |
| `data`         | `data: Buffer`   | The remote peer sent bytes                                                  |
| `transmit`     | `data`           | `write()` is called, before the bytes are sent                              |
| `error`        | `error: Error`   | The tunnel reported an error: `code` is the SDK's error number and `recoverable` says whether the SDK recovers from it, or the status check failed |

The component polls the tunnel's status every 100 milliseconds, so
a later `connect` and `disconnect` follow a change within that time.

When the SDK reports an error that is not recoverable, the component opens
a new tunnel after 1 second.

## Methods

| Method        | Description                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| `write(data)` | Sends a string or a `Buffer` to the remote peer. Throws `Can't write while TCP socket is not connected` when no peer is connected |
| `connected`   | Property: true while a peer is connected through the tunnel                              |
| `peerAddress` | Property: `tcp://` and the tunnel's addresses, or `undefined` while the tunnel is not open |

## Communication log

The channel `communication` ("Communication") is off by default and keeps
its records for 14 days. It is turned on in the profile's log settings.
The records have `details` set to `peerAddress`.

| Event        | Direction | Record                                              |
| ------------ | --------- | --------------------------------------------------- |
| `connect`    | `info`    | `Connected`                                         |
| `disconnect` | `info`    | `Disconnected`, with the reason when there is one   |
| `read`       | `in`      | The bytes the remote peer sent                      |
| `write`      | `out`     | The bytes passed to `write()`                       |

## Status

- Starting: `start()` returns once the local server listens; it does not wait
  for the tunnel. If the local server cannot listen (the `localPort` is
  taken), the start fails with `Can't create local listener. <reason>`.
- `started`: the tunnel is open. The component emits `connect` once.
- `unhealthy` with `Can't create tunnel. <reason>`: Pinggy refused the tunnel
  (for example a wrong token) or is unreachable. The component writes the
  error to its log and tries again every 5 seconds, until it is stopped. It
  is started when an attempt succeeds.
- `unhealthy` with `Tunnel disconnected`: an open tunnel's status became
  `closed`. When the status is `live` again, the component is `started`.
- `stopped`: the local connection is closed, the tunnel is stopped, then
  the local server.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { PinggyTcpClientComponent } from '@syncbridge/pinggy';

@App({ displayName: 'Tunnel echo' })
export class TunnelEchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly tunnel: PinggyTcpClientComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.tunnel.on('data', (data: Buffer) => {
      if (this.tunnel.connected) this.tunnel.write(data);
    });
    this.tunnel.on('error', err => this.logger?.warn(err.message));
  }
}
```

## Notes

- Anyone who has a public address can connect. The tunnel adds no
  authentication of its own: the app must check what it receives.
