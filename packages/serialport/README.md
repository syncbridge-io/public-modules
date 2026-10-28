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

SyncBridge servers install modules from the SyncBridge registry, through
the Marketplace or Console. The module is published there, not on npm:
the 1.0.x versions on npm are old and no longer updated.

It needs `@syncbridge/common`, which the engine provides, and
`@syncbridge/builtins`. `serialport` (13.x, with native bindings),
`@serialport/bindings-interface`, `reconnect-core`, `putil-varhelpers` and
`ansi-colors` are installed with it. `serialport` needs a prebuilt binary
for the platform or a build toolchain; see
[Device setup](https://github.com/syncbridge-io/syncbridge-extensions/blob/main/packages/serialport/docs/SerialPort/device-setup.md).

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

[docs](https://github.com/syncbridge-io/syncbridge-extensions/tree/main/packages/serialport/docs)
