# @syncbridge/ngrok

A tunnel through [ngrok](https://ngrok.com) for SyncBridge apps. The module
has one component that opens a local TCP server and an ngrok tunnel to it,
so a device or a service on the internet can connect to the server behind a
firewall or a NAT. The app reads what the remote side sends and writes back.

## Components

| Component        | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `NgrokTcpClient` | TCP tunnel through ngrok to a local server, with a `communication` log channel |

## Install

On a SyncBridge server, install the module from the Marketplace or from
Console. It is also on npm:

```bash
npm install @syncbridge/ngrok
```

Peer dependencies: `@syncbridge/common` (provided by the engine),
`@syncbridge/builtins`, `@ngrok/ngrok` (the ngrok agent SDK, 1.x, with
native bindings), `@jsopen/objects`, `fast-tokenizer` and `ansi-colors`.
With npm 7 or later the peers are installed with the package; with another
package manager, install them yourself. You also need an ngrok account and
an auth token, see the [component page](NgrokTcpClient/README.md).

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
    this.tunnel.on('data', (data: Buffer) => this.tunnel.write(data));
  }
}
```

## Documentation

[docs](https://github.com/panates/syncbridge-public-modules/tree/main/packages/ngrok/docs)
