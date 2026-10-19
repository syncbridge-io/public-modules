# @syncbridge/builtins

The base module of SyncBridge. It holds the abstract IO components that
other modules build on (the TCP, UDP, HL7, serial port and tunnel modules
all extend them) and an app that bridges two IO peers.

## What it brings

| Name          | Kind                | Description                                                                                          |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `IoClient`    | abstract component  | Base of components that connect to a peer. Writes its traffic to the `communication` log channel.    |
| `IoServer`    | abstract component  | Base of components that accept connections. Writes its traffic to the `communication` log channel.   |
| `IOBridgeApp` | app                 | Passes what one IO peer reads to the other peer, in both directions.                                 |
| `peerOf()`    | function            | Formats the other side of a connection (`address:port`) for a log record's `details`.                |

The abstract components cannot be used in an app on their own. Extend them
to write a component, or use a module that does.

## Install

SyncBridge servers install modules from the Marketplace or from Console.
The module is also on npm:

```bash
npm install @syncbridge/builtins
```

Peer dependency: `@syncbridge/common` (`>=1.1.3 <2`), which the engine
provides.

## Example

A component that extends `IoClientBaseComponent` and an app that uses it:

```ts
import { IoClientBaseComponent } from '@syncbridge/builtins';
import { Component } from '@syncbridge/common';

@Component({ className: 'MyClient' })
export class MyClientComponent extends IoClientBaseComponent {
  readonly protocol = 'my';

  write(data: string | Buffer): void {
    // send data to the device, then tell the engine and the log
    this.emit('transmit', Buffer.from(data));
  }
}
```

## Documentation

https://github.com/syncbridge-io/public-modules/tree/main/packages/builtins/docs
