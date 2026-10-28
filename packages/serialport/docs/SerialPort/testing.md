---
title: Testing
order: 3
---

# Testing without hardware

`@syncbridge/testing` provides virtual serial ports. The real `serialport`
package and the component run; only the operating system's side is
virtual, and the test plays the device. The tests of this module do this in
[virtual-serial.spec.ts](https://github.com/syncbridge-io/syncbridge-extensions/blob/main/packages/serialport/test/virtual-serial.spec.ts).

## Setup

Add `@syncbridge/testing` to the devDependencies. Import it before the
module under test: it wraps the `serialport` binding when it loads, and the
virtual ports must be in the list before the module reads it.

A small fixture package holds the app under test. In this repository it is
`test/_fixtures/serial-ext`: a `package.json` that depends on
`@syncbridge/serialport` and lists `@syncbridge/common` as a peer, and an
app with a `SerialClientComponent`.

## A test

```ts
import path from 'node:path';
import { ServiceStatus } from '@syncbridge/common';
import { createTestEnv } from '@syncbridge/testing';
import { expect } from 'expect';
import { SerialEchoApp } from './_fixtures/serial-ext/src/index.js';

const FIXTURE_DIR = path.resolve(import.meta.dirname, '_fixtures/serial-ext');
const PORT = '/dev/ttyVSB0';

describe('serial echo', () => {
  const env = createTestEnv({ from: FIXTURE_DIR });

  afterEach(() => env.reset());
  after(() => env.dispose());

  it('answers the device', async () => {
    const device = env.serialPort(PORT);
    const app = await env.start(SerialEchoApp, {
      components: { line: { values: { port: PORT } } },
    });
    expect(app.line.status).toBe(ServiceStatus.started);

    const conn = await device.connection();
    expect((await conn.request('ping')).toString()).toBe('PING');
  });
});
```

- `env.serialPort(path, { framing })` registers a device on a virtual
  port. Call it before the app starts. With `framing: { start, end }` the
  device reads and writes messages between those markers.
- `device.connection()` resolves with the device's side of the open port;
  `conn.request(data)` sends bytes to the component and resolves with the
  answer; `conn.close()` plays an unplugged device.
- `env.waitFor(component, status)` waits for a status, for example
  `unhealthy` after the device closes and `started` after the component
  reopens the port.
- Shorten `reconnect.initialDelay` and `reconnect.maxDelay` in the test's
  values so retries come quickly.
- A path that is not a virtual port behaves like a missing port: the
  component is `unhealthy` and keeps retrying.
