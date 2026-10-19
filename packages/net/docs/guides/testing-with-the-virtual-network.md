---
title: Testing with the virtual network
order: 1
---

# Testing with the virtual network

`@syncbridge/testing` replaces the network under the components of this
module with a virtual one. A test starts an app, connects to the server
components it declares and serves the hosts its client components connect
to, with no real port and no real device. Import it before the module under
test.

The tests in
[`test/virtual-network.spec.ts`](https://github.com/panates/syncbridge-public-modules/blob/main/packages/net/test/virtual-network.spec.ts)
are the working example. This page walks through it.

## The app under test

```ts
import type net from 'node:net';
import { App, AppBase } from '@syncbridge/common';
import { TcpClientComponent, TcpServerComponent } from '@syncbridge/net';

@App({ displayName: 'Echo' })
export class EchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly listener: TcpServerComponent;

  @App.UseComponent()
  declare readonly device?: TcpClientComponent;

  readonly fromDevice: string[] = [];

  protected async _init(): Promise<void> {
    await super._init();
    this.listener.server.on('connection', (socket: net.Socket) =>
      socket.on('data', (data: Buffer) =>
        socket.write(data.toString('latin1').toUpperCase(), 'latin1'),
      ),
    );
    this.device?.on('connect', () => this.device!.write('hello'));
    this.device?.on('data', (data: Buffer) =>
      this.fromDevice.push(data.toString()),
    );
  }
}
```

## The test environment

```ts
import path from 'node:path';
import { createTestEnv } from '@syncbridge/testing';

const FIXTURE = path.resolve(import.meta.dirname, '_fixtures/echo-ext');

describe('virtual network', () => {
  const env = createTestEnv({ from: FIXTURE });

  afterEach(() => env.reset());
  after(() => env.dispose());
  // tests
});
```

`from` is a folder with a `package.json` that depends on `@syncbridge/net`
and has the app's source. `reset()` stops the apps after each test and
`dispose()` ends the environment.

## Start an app and talk to its server

`env.start()` starts the app with values for its components. A listening
component gets an ephemeral port on `127.0.0.1` in place of the one in its
values, so two apps can use the same configured port in one test run.

```ts
const app = await env.start(EchoApp, {
  components: { listener: { values: { port: 7 } } },
});
const conn = await env.connect(app, 'listener');
expect((await conn.request('ping')).toString()).toBe('PING');
```

`env.connect(app, name, { framing })` opens a connection to a server
component. `framing: 'mllp'` frames messages as MLLP. A `{ start, end }`
object frames them between two control characters.

## Serve what a client connects to

`env.serve({ port })` stands a server in for a host a client component
connects to. The component's `host` can be any name.

```ts
const device = env.serve({ port: 4001 });
const app = await env.start(EchoApp, {
  components: {
    listener: { values: { port: 7 } },
    device: { values: { host: 'analyzer.lab', port: 4001 } },
  },
});
const conn = await device.connection();
expect((await conn.receive()).toString()).toBe('hello');
conn.send('result 42');
await env.waitForEvent(app.device!, 'data');
expect(app.fromDevice).toEqual(['result 42']);
```

## Read the communication log

`env.channelLogs(app, 'device/communication')` returns the records the
`device` component wrote to its `communication` channel. In a test the
channels are on. The records of the run above are:

| `event`   | message or data | `source` | `details`                          |
| --------- | --------------- | -------- | ---------------------------------- |
| `connect` | `Connected`     | `device` | `analyzer.lab:4001`                |
| `write`   | `hello`         | `device` | starts with `analyzer.lab:`        |
| `read`    | `result 42`     | `device` | starts with `analyzer.lab:`        |

Start the app with `logChannels: 'defaults'` to leave each channel as its
definition says. The communication channel is then off and
`channelLogs()` returns an empty list.

## Notes

- The tests show that a plain Node.js server and client in the same test,
  outside the apps, keep using the real network.
