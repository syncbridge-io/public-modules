---
title: Device setup
order: 2
---

# Device setup

## Port names

The `port` setting takes the path the operating system gives the port.

| System  | Names                                                                 |
| ------- | --------------------------------------------------------------------- |
| Linux   | `/dev/ttyS0` (built-in), `/dev/ttyUSB0` (most USB adapters), `/dev/ttyACM0` (USB devices of the CDC class) |
| macOS   | `/dev/tty.usbserial-XXXX`, `/dev/tty.usbmodemXXXX`                    |
| Windows | `COM1`, `COM2`, ...                                                   |

The numbers depend on the order devices are plugged in, so a USB adapter
can get a different name after a reboot. On Linux, the links under
`/dev/serial/by-id/` and `/dev/serial/by-path/` do not change; they can be
used as the `port` value.

The settings form suggests the ports the server has. The component calls
`list()` for the same information, so an app can show it too.

## Line settings

`baudRate`, `dataBits`, `stopBits` and `parity` must match the device.
Common devices use 9600 baud, 8 data bits, 1 stop bit and no parity
(9600 8N1), the defaults. Check the device manual. Flow control is off by
default; turn on `rtscts` for hardware flow control or `xon`/`xoff` for
software flow control only if the device needs it.

## Permissions on Linux

Serial devices belong to the group `dialout` (`uucp` on Arch and some
others). The user that runs the worker must be in that group:

```bash
sudo usermod -aG dialout <user>
```

The user logs in again, or the worker's service is restarted, for the
change to apply. Without it, opening the port fails with a permission
error (`EACCES`), and the component stays `unhealthy` and keeps retrying.

In a container, pass the device in (`--device /dev/ttyUSB0`) and make sure
the user inside the container can read it.

macOS and Windows need no group setup.

## The native package

`serialport` is a native package. It ships prebuilt binaries for common
platforms, installed with the package. If none matches the platform, npm
builds it and needs a C++ toolchain and Python. See the `serialport`
documentation for the supported platforms.

## When the port does not open

- The status message is the error the `serialport` package reports. A
  message about a missing file means the path does not exist; one about
  permission means the user is not allowed to open it, see above.
- Another process (a terminal program, a modem manager) may hold the port.
- A device that is plugged in later is picked up by the component's
  retries. Set `reconnect.initialDelay` and `reconnect.maxDelay` to the
  time the device takes to come back.
