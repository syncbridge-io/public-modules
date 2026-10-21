# @syncbridge/pinggy

A tunnel through [Pinggy](https://pinggy.io) for SyncBridge apps. The module
has one component that opens a local TCP server and a Pinggy tunnel to it,
so a device or a service on the internet can connect to the server behind a
firewall or a NAT. The app reads what the remote side sends and writes back.

## Components

| Component          | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `PinggyTcpClient`  | TCP tunnel through Pinggy to a local server, with a `communication` log channel |

## Install

On a SyncBridge server, install the module from the Marketplace or from
Console. It is also on npm:

```bash
npm install @syncbridge/pinggy
```

Peer dependencies: `@syncbridge/common` (provided by the engine),
`@syncbridge/builtins`, `@pinggy/pinggy` (the Pinggy SDK, 0.5.x),
`@jsopen/objects` and `ansi-colors`. With npm 7 or later the peers are
installed with the package; with another package manager, install them
yourself. You also need a Pinggy auth token, see the
[component page](PinggyTcpClient/README.md).

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
    this.tunnel.on('data', (data: Buffer) => this.tunnel.write(data));
  }
}
```

## Documentation

[docs](https://github.com/syncbridge-io/public-modules/tree/main/packages/pinggy/docs)
