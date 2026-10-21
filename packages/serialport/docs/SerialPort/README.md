# SerialPort

`SerialPort` opens a serial port on the server and exchanges bytes with the
device on it. Use it for instruments, meters, barcode scanners and other
devices on RS-232, RS-485 or a USB serial adapter. If the port cannot be
opened or the device is unplugged, the component retries with a growing
delay until it is stopped.

For port names and permissions see [Device setup](device-setup.md). For
testing an app that uses it without hardware see [Testing](testing.md).

## Settings

All settings can be changed while the component runs (hot plug). A change
restarts the component: it closes the port and opens it again with the new
values.

| Setting      | Label                  | What it does                                                                 | Default | Required |
| ------------ | ---------------------- | ---------------------------------------------------------------------------- | ------- | -------- |
| `port`       | Port                   | The system path of the serial port: `/dev/tty.XXX` on macOS and Linux, `COM1` on Windows | | yes |
| `baudRate`   | Baud rate              | Baud rate of the port. Common values: 110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200. Other rates work best effort per platform. The device may not support the rate the port does | `9600` | yes |
| `dataBits`   | Data bits              | `5`, `6`, `7` or `8`                                                         | `8`     | yes      |
| `stopBits`   | Stop bits              | `1`, `1.5` or `2`                                                            | `1`     | no       |
| `parity`     | Parity flow control    | `none`, `even`, `mark`, `odd` or `space`                                     | `none`  | no       |
| `rtscts`     | RTS/CTS                | RTS/CTS flow control                                                         | false   | no       |
| `xon`        | XON                    | XON flow control                                                             | false   | no       |
| `xoff`       | XOFF                   | XOFF flow control                                                            | false   | no       |
| `xany`       | XANY                   | XANY flow control                                                            | false   | no       |
| `hupcl`      | HUPCL                  | Drop DTR on close                                                            | true    | no       |
| `reconnect`  | Reconnect Options      | How the connection is retried when it fails or is lost, below                |         | no       |

The engine fills in the list of ports for `port` from the serial ports of
the server. The list is a suggestion: any path can be typed, including one
whose device is not plugged in yet.

### Reconnect

| Setting        | Label                   | What it does                       | Default     | Required |
| -------------- | ----------------------- | ---------------------------------- | ----------- | -------- |
| `strategy`     | Reconnection strategy   | `fibonacci` or `exponential` growth of the delay | `fibonacci` | no |
| `initialDelay` | Initial delay           | Initial delay in milliseconds      | `2000`      | no       |
| `maxDelay`     | Maximum delay           | Maximum delay in milliseconds      | `10000`     | no       |

## Events

Listen with `component.on(name, handler)`.

| Event          | Arguments            | When                                                           |
| -------------- | -------------------- | -------------------------------------------------------------- |
| `connect`      |                      | The port is open                                               |
| `data`         | `data: Buffer`       | The device sent bytes. Chunks are as they arrive: the component does no framing |
| `transmit`     | `data`               | `write()` is called, before the bytes are sent                 |
| `reconnecting` | `n`, `delay`         | A try failed; the next one is made after `delay` milliseconds  |
| `disconnect`   | `error?`             | The port closed: the component was stopped while connected (no error), or the device went away (with the error, if there is one) |
| `reconnect`    |                      | The port is open again after one or more failed tries or a lost connection. Emitted just before `connect` |
| `stop`         |                      | The port is closed because the component was stopped (awaited) |
| `error`        | `error: Error`       | The port reported an error                                     |

An `error` is also written to the component's log.

## Methods

| Method                 | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `write(data)`          | Sends a string or a `Buffer`. Returns without waiting for the bytes to leave. Throws `Can't write while serial port is not connected` when the port is not open |
| `list()`               | Returns the serial ports the machine has, as `PortInfo[]` of the `serialport` package (`path`, `manufacturer`, `serialNumber` and so on) |
| `connected`            | Property: true while the port is open                                       |
| `peerAddress`          | Property: the `port` setting                                                |

## Communication log

The channel `communication` ("Communication") is off by default and keeps
its records for 14 days. It is turned on in the profile's log settings.
The records have `details` set to the port path.

| Event        | Direction | Record                                                      |
| ------------ | --------- | ----------------------------------------------------------- |
| `connect`    | `info`    | `Connected`                                                 |
| `disconnect` | `info`    | `Disconnected`, or `Disconnected: <error text>` when the device went away with an error. Written when the component is stopped while connected and when the device goes away |
| `read`       | `in`      | The bytes the device sent, from each `data` event           |
| `write`      | `out`     | The bytes passed to `write()`                               |

A device that goes away while the component runs is also shown in the
status and the text log.

## Status

- `started`: the component starts as soon as it is told to; it does not
  wait for the port. It stays `started` once the port is open.
- `unhealthy`: the port could not be opened, or it closed while the
  component runs. The status message is the error's message, or
  `Disconnected`. The component keeps trying with the delay set under
  Reconnect. It is `started` again as soon as a try succeeds.
- `stopped`: the port is closed and no more tries are made.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { SerialClientComponent } from '@syncbridge/serialport';

@App({ displayName: 'Scale reader' })
export class ScaleReaderApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly scale: SerialClientComponent;

  readonly weights: number[] = [];
  #buffer = '';

  protected async _init(): Promise<void> {
    await super._init();
    this.scale.on('data', (chunk: Buffer) => {
      // The device ends each reading with a line feed
      this.#buffer += chunk.toString('ascii');
      let i: number;
      while ((i = this.#buffer.indexOf('\n')) >= 0) {
        this.weights.push(parseFloat(this.#buffer.slice(0, i)));
        this.#buffer = this.#buffer.slice(i + 1);
      }
    });
  }

  tare() {
    this.scale.write('T\r\n');
  }
}
```

## Notes

- The component does not split the stream into messages. An app that
  needs frames collects the chunks from `data` itself.
- Only one component can hold a port open at a time.
