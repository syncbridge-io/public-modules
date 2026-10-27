# HL7Endpoint

The abstract base of [HL7Client](../HL7Client/README.md) and
[HL7Server](../HL7Server/README.md). It is not used on its own: an app
declares a component slot of this type when the other side may be either a
client or a server, and the user picks one of the two in that slot.

A device that speaks HL7 often works either way: it connects to the engine,
or the engine connects to it. With two optional slots, one for each
component, a profile could fill both or neither. A single slot typed by the
base can be required, and the app handles messages the same way whichever
component fills it.

## What both have

- `use(handler, priority?)` adds a handler for received messages. A handler
  is `(req, res) => void | Promise<void>`: `req.message` is the received
  message and `res.message` is the answer to send. Handlers are kept when
  the component is rebuilt after a settings change.
- `beforeResponse(hook)` adds a hook that sees every answer before it is
  sent. It may change the answer in place, return another message, or
  return `null` to send nothing. Hooks are kept across settings changes.
- `connected` is `true` while a peer is connected: the server for the client,
  at least one device for the server.
- The `communication` log channel, off by default.
- The events `message`, `send`, `data`, `transmit` and `error`. Their
  arguments are those of each component; the server adds the peer's
  `socket` as the last argument.
- The HL7 settings: Response timeout, Accept acknowledgment, Validate
  messages, Default character set and Batch acknowledgment.

Sending a message of the app's own and the connection events stay with each
component (`client` of HL7Client; `connection` / `disconnect` of HL7Server).

## Example

An app for a device that either sends its results to the engine or waits
for the engine to connect:

```ts
import { App, AppBase } from '@syncbridge/common';
import { HL7EndpointComponent } from '@syncbridge/hl7';

@App({ description: 'Receives the results of an HL7 device' })
export class DeviceResultsApp extends AppBase {
  /* HL7 Client or HL7 Server, whichever the device needs */
  @App.UseComponent({ required: true })
  declare readonly hl7: HL7EndpointComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.hl7.use(async (req, res) => {
      // Store req.message here; a thrown error becomes a negative answer.
      res.message = req.message.createAck();
    });
  }
}
```
