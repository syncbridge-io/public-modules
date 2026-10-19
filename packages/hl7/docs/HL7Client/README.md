# HL7Client

Connects to an HL7 v2 server over MLLP, sends messages to it and receives the
messages it sends. Use it when the engine must push messages to a HIS, a lab
system or a device. The connection is opened when the component starts and
opened again when it is lost.

## Settings

| Setting                | Key                    | Description                                                                                                                                                    | Default     | Required |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- |
| Host                   | `host`                 | Hostname or IP address to connect to.                                                                                                                          |             | Yes      |
| Port                   | `port`                 | Port number of the target listener (1-65535).                                                                                                                  |             | Yes      |
| Bind Interface         | `bindInterface`        | Interface address to bind to. If empty, binds to all available addresses.                                                                                      |             | No       |
| Keep alive             | `keepAlive`            | Enables keep-alive on the TCP socket.                                                                                                                          | false       | No       |
| Connect timeout        | `connectTimeout`       | Connection timeout in milliseconds.                                                                                                                            | 10000       | No       |
| Response timeout       | `responseTimeout`      | Response timeout in milliseconds.                                                                                                                              | 30000       | No       |
| Reconnect              | `reconnect`            | Reconnection options. See below.                                                                                                                               |             | No       |
| Accept acknowledgment  | `acceptAcknowledgment` | `processed` or `receipt`: when the accept acknowledgment (MSH-15) of a received message is sent. Same as in [HL7Server](../HL7Server/acknowledgement-modes.md). | `processed` | No       |
| Validate messages      | `validate`             | Validate received messages against the definitions of their HL7 version. A message that fails is answered with a NAK and is not handled.                       | false       | No       |
| Default character set  | `defaultCharset`       | Character set of a message whose MSH-18 is empty or unknown, for example `windows-1254`. Without it, UTF-8.                                                    |             | No       |
| Batch acknowledgment   | `batchAcknowledgment`  | Which acknowledgments a received batch is answered with: `all`, `errors` or `none`.                                                                            | `all`       | No       |
| TLS Enabled            | `tls_enabled`          | Use TLS for the connection.                                                                                                                                    |             | No       |
| TLS                    | `tls`                  | TLS options. TLS is on only when `tls_enabled` is true and `tls` is set. See below.                                                                                                              |             | No       |
| Proxy Enabled, Proxy   | `proxy_enabled`, `proxy` | SOCKS proxy options inherited from the TCP client settings. They do nothing: see Notes.                                                                      |             | No       |

### Reconnect

| Setting             | Key            | Description                                           | Default       | Required |
| ------------------- | -------------- | ----------------------------------------------------- | ------------- | -------- |
| Reconnection strategy | `strategy`   | `exponential` or `fibonacci`.                         | `exponential` | No       |
| Initial delay       | `initialDelay` | Initial delay in milliseconds.                        | 2000          | No       |
| Maximum delay       | `maxDelay`     | Maximum delay in milliseconds.                        | 10000         | No       |

### TLS

| Setting              | Key                  | Description                                                                                          | Default | Required |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- | ------- | -------- |
| SNI                  | `servername`         | Server Name Indication.                                                                              |         | No       |
| Key                  | `key`                | Private key in PEM format.                                                                           |         | No       |
| Cert                 | `cert`               | Certificate chain in PEM format.                                                                     |         | No       |
| CA certificates      | `ca`                 | Overrides the trusted CA certificates. Mozilla's well-known CAs are replaced when it is set.         |         | No       |
| Passphrase (secret)  | `passphrase`         | Passphrase to decrypt the private key.                                                               |         | No       |
| Reject unauthorized  | `rejectUnauthorized` | Reject a connection to a server not authorized by the supplied CAs.                                  | true    | No       |

## Events

Listen with `component.on(name, listener)`. `info` is `{ address, port }` of
the server; `toString()` gives `address:port`.

| Event      | Arguments         | Emitted when                                          |
| ---------- | ----------------- | ----------------------------------------------------- |
| `connect`  | `info`            | The connection is open.                               |
| `ready`    | `info`            | The underlying client reports it is ready.            |
| `close`    | `info`            | The connection is closed.                             |
| `message`  | `message`, `info` | A message is received. `message` is an `HL7Message`.  |
| `send`     | `message`, `info` | A message is sent.                                    |
| `data`     | `data`, `info`    | Raw bytes are received.                               |
| `transmit` | `data`, `info`    | Raw bytes are written. `data` is a `Buffer`. The communication log writes them as `out` records. |
| `error`    | `error`, `info`   | An error occurs. A refused connection reads `Connection refused to host:port`. |

## Methods

- `client` is the underlying `Hl7Client` of hl7v2-net. Send with it:
  `client.sendMessage(message)` sends without waiting, and
  `client.sendMessageWaitAck(message)` resolves with the acknowledgment. It is
  replaced each time the component starts or its settings change: read
  `component.client` when you need it, do not keep it.
- `use(handler, priority?)` adds a handler for messages the server sends to the
  client. A handler is `(req, res) => void | Promise<void>`; set
  `res.message` to answer. Handlers are kept across settings changes.
- `beforeResponse(hook)` adds a hook that sees every answer before it is sent.
  It may change the answer in place, return another message, or return `null`
  to send nothing. Hooks are kept across settings changes.

See the hl7v2-net documentation for what the sending methods throw.

## Communication log

The `communication` channel is off by default; turn it on in the profile's log
settings. A record has a `direction`, an optional `event`, `data`, `message`
and `details` (the server as `address:port`).

| Direction | Event        | Data               | Written when                          |
| --------- | ------------ | ------------------ | ------------------------------------- |
| `info`    | `connect`    |                    | The connection is open.               |
| `info`    | `disconnect` |                    | The connection is closed.             |
| `in`      |              | The bytes received | Data arrives from the server.         |
| `out`     |              | The bytes written  | Data is written to the server.        |

## Status

- Started: the connection is open. `start()` begins to connect and does not
  wait for the connection; until it is open, the status is unhealthy.
- Unhealthy: the connection is not open yet, or it was lost. The component
  connects again with the Reconnect settings.
- Stopped: the connection is closed. It waits up to 30 seconds for running
  handlers.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { HL7ClientComponent } from '@syncbridge/hl7';
import { HL7Message } from 'hl7v2';

@App({ description: 'Sends lab results to the HIS' })
export class ResultSenderApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly his: HL7ClientComponent;

  async send(text: string): Promise<boolean> {
    const ack = await this.his.client.sendMessageWaitAck(HL7Message.parse(text));
    return ack.get('MSA-1') === 'AA';
  }
}
```

## Notes

- The client is created when the component starts, and once when it is
  initialized, so that `use()` and `beforeResponse()` have a client to add to.
  When a setting changes while the component runs, the component restarts in
  place with a new client. Handlers and hooks are kept.
- With TLS, `bindInterface` is applied as the local address, as without it,
  and the reconnect strategy defaults to `exponential`.
- The Proxy settings are shown because the component inherits them from the
  TCP client. They do nothing: the hl7v2-net library cannot use a SOCKS
  proxy, so connections never go through one.
