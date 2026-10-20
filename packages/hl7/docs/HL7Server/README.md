# HL7Server

Receives HL7 v2 messages over MLLP on a TCP port and acknowledges them. Use it
when a device or system (a monitor, a HIS, a lab system) sends messages to the
engine. The app adds handlers with `use()`; the component sends the
acknowledgments.

## Settings

| Setting                  | Key                    | Description                                                                                                                                                                  | Default | Required |
| ------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| Port                     | `port`                 | Port number to listen on (1-65535).                                                                                                                                          |         | Yes      |
| Bind Interface           | `bindInterface`        | Interface address to bind to. If empty, binds to all available addresses.                                                                                                    |         | No       |
| Response timeout         | `responseTimeout`      | How long a message may take to be handled, in milliseconds. Past it, the sender is answered with an error acknowledgment.                                                    | 30000   | No       |
| Accept acknowledgment    | `acceptAcknowledgment` | `processed` or `receipt`. When the accept acknowledgment a message asks for (MSH-15) is sent. See [Acknowledgment modes](acknowledgement-modes.md).                          | `processed` | No   |
| Validate messages        | `validate`             | Validate received messages against the definitions of their HL7 version. A message that fails is answered with a NAK that lists its errors and is not handled.              | false   | No       |
| Default character set    | `defaultCharset`       | Character set of a message whose MSH-18 is empty or unknown, for example `windows-1254`. Without it, UTF-8.                                                                  |         | No       |
| Batch acknowledgment     | `batchAcknowledgment`  | Which acknowledgments a received batch is answered with: `all`, `errors` (only those of messages that failed) or `none`.                                                     | `all`   | No       |
| TLS Enabled              | `tls_enabled`          | Use TLS for connections.                                                                                                                                                     |         | No       |
| TLS                      | `tls`                  | TLS options. TLS is on only when `tls_enabled` is true and `tls` is set. See below.                                                                                                                            |         | No       |
| Socket                   | `socket`               | Socket options (keep-alive, blocked addresses). See the note below.                                                                                                          |         | No       |

### TLS

| Setting                              | Key                      | Description                                                                                              | Default | Required |
| ------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------- | ------- | -------- |
| Cert                                 | `cert`                   | Certificate chain in PEM format, followed by the intermediate certificates, without the root CA.         |         | Yes      |
| Key                                  | `key`                    | Private key in PEM format.                                                                               |         | Yes      |
| Passphrase (secret)                  | `passphrase`             | Passphrase of the private key.                                                                           |         | No       |
| CA certificates                      | `ca`                     | Overrides the trusted CA certificates. Mozilla's well-known CAs are replaced when it is set.             |         | Yes      |
| CRL (Certificate Revocation Lists)   | `crl`                    | PEM formatted CRLs.                                                                                      |         | No       |
| Reject unauthorized                  | `rejectUnauthorized`     | Reject connections not authorized by the supplied CAs. Has an effect only if Request cert is on.         | true    | No       |
| Handshake Timeout                    | `handshakeTimeout`       | Abort the connection if the TLS handshake does not finish in this many milliseconds.                     | 120000  | No       |
| Request cert                         | `requestCert`            | Request a certificate from clients and verify it.                                                        | false   | No       |
| Session Timeout                      | `sessionTimeout`         | Seconds after which a TLS session can no longer be resumed.                                              |         | No       |
| Allow Partial Trust Chain            | `allowPartialTrustChain` | Treat intermediate certificates in the trusted CA list as trusted.                                       |         | No       |
| Sigalgs                              | `sigalgs`                | Colon-separated list of supported signature algorithms.                                                  |         | No       |

### Socket

The Socket group (Allow Half Open, Keep Alive, Keep Alive Initial Delay, No
Delay, Blocked Ips, Blocked Subnets) is inherited from the TCP server
settings. The component passes it, and the TLS settings, to the server with
`variablesToNodeOptions()` of the
[TcpServer](https://github.com/syncbridge-io/public-modules/tree/main/packages/builtins/docs/TcpServer) component, so they work:
a connection from a blocked address or subnet is refused. Both block lists
apply; the default prefix of a subnet is 32 for IPv4 and 128 for IPv6.

Only `responseTimeout` and the four protocol settings (Accept
acknowledgment, Validate messages, Default character set, Batch
acknowledgment) are live. A change of any other setting restarts the
worker.

## Events

Listen with `component.on(name, listener)`. Where an event gives `info`, it is
`{ address, port }` of the peer; `toString()` gives the address.

| Event        | Arguments                | Emitted when                                                                      |
| ------------ | ------------------------ | --------------------------------------------------------------------------------- |
| `listening`  |                          | The server listens on its port.                                                   |
| `close`      |                          | The server is closed.                                                             |
| `connection` | `info`, `socket`         | A peer connects.                                                                  |
| `disconnect` | `info`, `socket`         | A peer disconnects.                                                               |
| `message`    | `message`, `info`, `socket` | A message is received. `message` is an `HL7Message`.                           |
| `send`       | `message`, `info`, `socket` | A message (an acknowledgment) is sent to a peer.                               |
| `data`       | `data`, `info`, `socket` | Raw bytes are received. `data` is a `Buffer`.                                     |
| `transmit`   | `data`, `info`, `socket` | Raw bytes are written to a peer. `data` is a `Buffer`.                            |
| `error`      | `error`, `info?`, `socket?` | An error occurs. `ECONNRESET` from a peer is ignored.                          |

## Methods

- `use(handler, priority?)` adds a handler for received messages. A handler is
  `(req, res) => void | Promise<void>`: `req.message` is the received message
  and `res.message` is the answer to send. Throwing an error, or running past
  the response timeout, makes the sender get a negative answer. Handlers are
  kept when the component is rebuilt after a settings change.
- `beforeResponse(hook)` adds a hook that sees every answer before it is sent.
  It may change the message in place, return another message to send instead,
  or return `null` to send nothing. Hooks are kept across settings changes.
  See [Acknowledgment modes](acknowledgement-modes.md).
- `server` is the underlying `HL7Server` of hl7v2-net. It is replaced when the
  component starts or its settings change: do not keep a reference to it.

## Communication log

The `communication` channel is off by default; turn it on in the profile's log
settings. A record has a `direction`, an optional `event`, `data`, `message`
and `details` (the peer as `address:port`).

| Direction | Event        | Data                          | Written when                |
| --------- | ------------ | ----------------------------- | --------------------------- |
| `info`    | `connect`    |                               | A peer connects.            |
| `info`    | `disconnect` |                               | A peer disconnects.         |
| `in`      |              | The bytes received            | Data arrives from a peer.   |
| `out`     |              | The bytes written             | Data is written to a peer.  |

## Status

- Started: the server listens.
- Unhealthy: a server error occurs while it is not listening (for example, the
  port is in use). The component also emits `error`. When the port cannot be
  bound, starting the component fails with that error.
- Stopped: the server is closed. It waits up to 30 seconds for running
  handlers.

## Example

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
      const controlId = req.message.get('MSH-10');
      await this.store(controlId, req.message.toString());
      res.message = req.message.createAck();
    });

    this.hl7.on('error', err => this.emit('error', err));
  }

  private async store(id: unknown, text: string): Promise<void> {
    // Write to a database, a queue, ...
  }
}
```

## Notes

- The server is created when the component starts, and once when it is
  initialized, so that `use()` and `beforeResponse()` have a server to add to.
  When a live setting changes while the component runs, the component
  restarts in place with a new server and open connections are closed.
  Handlers added with `use()` and hooks added with `beforeResponse()` are
  kept.
- The component has no `send()`: an HL7 server answers messages, it does not
  start them.
