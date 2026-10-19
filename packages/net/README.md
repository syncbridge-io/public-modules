# @syncbridge/net

Network components for SyncBridge: TCP and UDP clients and servers, and an
HTTP server. They extend the `IoClient` and `IoServer` components of
`@syncbridge/builtins`, so they write their traffic to the `communication`
log channel and work with the `IOBridgeApp` app.

## What it brings

| Component     | Description                                                                         |
| ------------- | ----------------------------------------------------------------------------------- |
| `TcpClient`   | Connects to a TCP server, with reconnection, TLS and a SOCKS proxy.                 |
| `TcpServer`   | Listens for TCP connections, with TLS, socket options and an IP block list.         |
| `UdpClient`   | Sends and receives UDP datagrams, to one host or to any.                            |
| `UdpListener` | Listens on a UDP port, with broadcast and multicast groups.                         |
| `HttpServer`  | Listens for HTTP or HTTPS requests. The app handles them on the Node.js server.     |

## Install

SyncBridge servers install modules from the Marketplace or from Console.
The module is also on npm:

```bash
npm install @syncbridge/net
```

Peer dependencies: `@syncbridge/common`, `@syncbridge/builtins`,
`@jsopen/objects`, `ansi-colors`, `backoff`, `node-events-async` and
`socks`. The engine and the other modules provide them.

## Example

An app that answers what a TCP client sends it, and listens to a device:

```ts
import { App, AppBase } from '@syncbridge/common';
import { TcpClientComponent, TcpServerComponent } from '@syncbridge/net';

@App({ displayName: 'Echo' })
export class EchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly listener: TcpServerComponent;

  @App.UseComponent()
  declare readonly device?: TcpClientComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.listener.server.on('connection', socket =>
      socket.on('data', data => socket.write(data)),
    );
    this.device?.on('connect', () => this.device!.write('hello'));
    this.device?.on('data', data => console.log(String(data)));
  }
}
```

## Documentation

https://github.com/syncbridge-io/public-modules/tree/main/packages/net/docs
