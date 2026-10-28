# NgrokTcpClient

`NgrokTcpClient` makes a TCP service of an app reachable from the internet
through [ngrok](https://ngrok.com). Use it when a remote device or system
must connect to the server but the server has no public address.

## How it works

1. The component opens a TCP server on `127.0.0.1`, on the `localPort`
   setting or a free port.
2. It starts an ngrok tunnel to that port with the ngrok agent SDK
   (`@ngrok/ngrok`). ngrok gives the tunnel a public address, such as
   `tcp://0.tcp.ngrok.io:12345`. The component's `peerAddress` is that
   address once the tunnel is open.
3. A remote peer connects to the public address. The ngrok agent, which
   runs inside the worker's process, connects to the local server and
   passes the bytes both ways.
4. The component emits what arrives as `data` events and sends what the app
   passes to `write()`.

The component uses the most recent connection: when a new one arrives, the
earlier one is no longer read or written to. To get the address, read
`peerAddress`, or find it in the component's log (`Ngrok tunnel
connected: ...`).

## The auth token

The tunnel needs an ngrok account. Sign in to the ngrok dashboard, copy
the auth token from its "Your Authtoken" page, and put it in the
`authToken` setting. The token is a secret: keep it out of source
control and out of logs. TCP endpoints are not available on every ngrok
plan; the ngrok documentation lists the requirements.

## Changing settings

Both settings can be changed while the component runs. A change restarts
the component, which opens a new tunnel.

## Events

| Event          | Arguments        | When                                                                  |
| -------------- | ---------------- | --------------------------------------------------------------------- |
| `connect`      |                  | The tunnel is open, and again each time it connects after it was closed |
| `disconnect`   | `error?: Error`  | The tunnel's status becomes `closed`. Carries an error unless the component is stopping |
| `data`         | `data: Buffer`   | The remote peer sent bytes                                            |
| `transmit`     | `data`           | `write()` is called, before the bytes are sent                        |

## Methods

| Method        | Description                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| `write(data)` | Sends a string or a `Buffer` to the remote peer. Throws `Can't write while TCP socket is not connected` when no peer is connected |
| `connected`   | Property: true while a peer is connected through the tunnel                              |
| `peerAddress` | Property: the tunnel's public address, or `undefined` while the tunnel is not open       |

## Communication log

The channel `communication` ("Communication") is off by default and keeps
its records for 14 days. It is turned on in the profile's log settings.
The records have `details` set to the tunnel's public address.

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
- `unhealthy` with `Can't create Ngrok tunnel. <reason>`: ngrok refused the
  tunnel (for example a wrong token) or is unreachable. The component writes
  the error to its log and tries again every 5 seconds, until it is stopped.
  It is started when an attempt succeeds.
- `unhealthy` with `Ngrok tunnel disconnected`: an open tunnel's status
  became `closed`. When the tunnel's status is `connected` again, the
  component is `started`.
- `stopped`: the tunnel is closed, then the local server.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { NgrokTcpClientComponent } from '@syncbridge/ngrok';

@App({ displayName: 'Tunnel echo' })
export class TunnelEchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly tunnel: NgrokTcpClientComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.tunnel.on('connect', () =>
      this.logger?.info(`Tunnel is open at ${this.tunnel.peerAddress}`),
    );
    this.tunnel.on('data', (data: Buffer) => {
      if (this.tunnel.connected) this.tunnel.write(data);
    });
  }
}
```

## Notes

- Anyone who has the public address can connect. The tunnel adds no
  authentication of its own: the app must check what it receives.
- Earlier connections stay open when a new one arrives; they are only
  no longer read or written to.
