# @syncbridge/hl7

HL7 v2 over MLLP for SyncBridge. The module has two components: a server that
receives HL7 messages and acknowledges them, and a client that connects to an
HL7 server and exchanges messages with it. Parsing and framing are done by
[hl7v2](https://www.npmjs.com/package/hl7v2) and
[hl7v2-net](https://www.npmjs.com/package/hl7v2-net).

## Components

| Component  | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| HL7Server  | Listens on a TCP port (optionally TLS) and acknowledges messages.  |
| HL7Client  | Connects to an HL7 server, reconnects when the connection is lost. |

## Install

SyncBridge servers install modules from the Marketplace or from Console.

The module is also on npm:

```bash
npm install @syncbridge/hl7
```

Peer dependencies: `@syncbridge/common`, `@syncbridge/builtins`,
`ansi-colors`, `hl7v2` and `hl7v2-net`. The engine provides the
`@syncbridge/*` packages. When you use the module outside the engine,
install all of them yourself, including `ansi-colors`, `hl7v2` and
`hl7v2-net`.

## Example

An app that stores every received ORU message and acknowledges it:

```ts
import { App, AppBase } from '@syncbridge/common';
import { HL7ServerComponent } from '@syncbridge/hl7';

@App({ description: 'Receives ORU messages' })
export class OruReceiverApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly hl7: HL7ServerComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.hl7.use(async (req, res) => {
      // Store req.message here; a thrown error becomes a negative answer.
      res.message = req.message.createAck();
    });
  }
}
```

## Documentation

https://github.com/syncbridge-io/public-modules/tree/main/packages/hl7/docs
