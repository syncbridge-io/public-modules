# @syncbridge/serialport

Serial port access for SyncBridge apps. The module has one component that
opens a serial port (RS-232, RS-485 or USB serial adapter), reads what the
device sends, writes to it, and opens the port again when the device goes
away and comes back.

## Components

| Component    | Description                                                        |
| ------------ | ------------------------------------------------------------------ |
| `SerialPort` | Serial port client with reconnect and a `communication` log channel |

## Install

On a SyncBridge server, install the module from the Marketplace or from
Console. It is also on npm:

```bash
npm install @syncbridge/serialport
```

Peer dependencies: `@syncbridge/common` (provided by the engine),
`@syncbridge/builtins`, `serialport` (13.x, with native bindings),
`@serialport/bindings-interface`, `reconnect-core`, `putil-varhelpers`
and `ansi-colors`. With npm 7 or later the peers are installed with the
package; with another package manager, install them yourself. `serialport`
needs a prebuilt binary for the platform or a build toolchain; see
[Device setup](SerialPort/device-setup.md).

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { SerialClientComponent } from '@syncbridge/serialport';

@App({ displayName: 'Serial echo' })
export class SerialEchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly line: SerialClientComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.line.on('data', (data: Buffer) => {
      this.line.write(data.toString('latin1').toUpperCase());
    });
  }
}
```

## Documentation

[docs](https://github.com/panates/syncbridge-public-modules/tree/main/packages/serialport/docs)
