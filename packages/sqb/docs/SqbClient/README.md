# SqbClient

`SqbClient` keeps a connection pool to a PostgreSQL or Oracle database and
gives an app its [SQB](https://github.com/panates/sqb) client. Use it when
an app reads or writes a relational database. The component checks the
connection when it starts and every 5 seconds after that, so the app's
status shows a database that goes away.

The databases need drivers on the server: see
[Database drivers](drivers.md).

## Settings

Settings marked "hot plug" can be changed while the component runs. Any
change to the values restarts the component: it closes its client and
builds a new one from the new values.

| Setting          | Label               | What it does                                                                                           | Default      | Required |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------ | ------------ | -------- |
| `dialect`        | Dialect             | Database dialect: `postgres` or `oracle`                                                               |              | yes      |
| `host`           | Host                | Database server address or URL                                                                         |              | no       |
| `port`           | Port                | Database listener port, 1 to 65535                                                                     |              | no       |
| `username`       | Username            | Database username                                                                                      |              | no       |
| `password`       | Password (secret)   | Database password                                                                                      |              | no       |
| `database`       | Database name       | Database to connect to                                                                                 |              | no       |
| `schema`         | Database schema     | Schema to connect to                                                                                   |              | no       |
| `applicationName`| Application Name    | Name passed to the client as the connection name, for debugging                                        | `syncbridge` | no       |
| `pool`           | Pooling             | Pool options, below                                                                                    |              | no       |

All settings are hot plug. `dialect` is the only required setting.
`password` is a secret.

### Pool

| Setting               | Label                  | What it does                                                          | Default |
| --------------------- | ---------------------- | --------------------------------------------------------------------- | ------- |
| `acquireMaxRetries`   | Acquire max retries    | How many times the pool tries to create a connection before it returns the error | 0       |
| `acquireRetryWait`    | Acquire retry wait     | Milliseconds the pool waits between tries                             | 2000    |
| `acquireTimeoutMillis`| Acquire timeout millis | Milliseconds an acquire call waits for a connection before it times out | 0       |
| `idleTimeoutMillis`   | Idle timeout           | Minimum milliseconds a connection may sit idle in the pool            | 30000   |
| `min`                 | Min                    | Minimum number of connections the pool keeps                          | 0       |
| `minIdle`             | Min idle               | Minimum number of idle connections the pool keeps                     | 0       |
| `max`                 | Max                    | Maximum number of connections the pool creates                        | 30      |
| `maxQueue`            | Max queue              | Maximum number of requests the pool accepts                           | 1000    |

All pool settings are hot plug. The pool belongs to `@sqb/connect`.

## Events

The component emits no events of its own. The client it returns emits
`execute` (a query runs), `error`, `acquire`, `closing`, `close` and
`terminate`; an app can listen to them on `getClient()`.

## Methods

| Method        | Description                                                                        |
| ------------- | ---------------------------------------------------------------------------------- |
| `getClient()` | Returns the SQB `SqbClient`. Throws `SqbClient component is not initialized` before the component is initialized. |

The client object is replaced each time the component starts, so an app
calls `getClient()` for each use instead of keeping the result. For the
client's own API (`execute`, `acquire`, repositories) see the SQB
documentation.

## Communication log

The component has one log channel, `queries` ("Queries"). It is off by
default and keeps its records for 7 days. Its events are `execute` and
`error`.

| Event     | Level   | Message                                  | Fields                              |
| --------- | ------- | ---------------------------------------- | ----------------------------------- |
| `execute` | `info`  | The SQL text                             | `params`, when the query has any    |
| `error`   | `error` | The error message, then `SQL: <sql>` when the error carries the query | `params`, when the error carries them |

Parameters are written as they are. They may hold data that should not be
kept, which is why the channel is off by default. When the component's
logger is at `debug` level, a failing query is also written to the text
log with its SQL and parameters.

## Status

- `starting`: the component builds its client and runs a connection test.
- `started`: the test succeeded.
- A failed test during start sets `unhealthy` with the message
  `Database connection failed. <reason>`, and the start fails with that
  error. The runtime then stops the component.
- While running, the component tests the connection every 5 seconds (the
  timer restarts on each connection acquire). A failed test sets
  `unhealthy`; the next successful test sets `started` again.
- `stopped`: the client is closed, which waits for the pool to drain.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { SqbClientComponent } from '@syncbridge/sqb';

@App({ displayName: 'Orders' })
export class OrdersApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly db: SqbClientComponent;

  async findOrder(id: number) {
    const result = await this.db
      .getClient()
      .execute('select * from orders where id = :id', {
        params: { id },
        objectRows: true,
      });
    return result.rows?.[0];
  }
}
```

## Notes

- Both dialects are registered when the module loads, so a worker that
  loads the component needs the PostgreSQL and the Oracle drivers
  installed.
- The `applicationName` setting is passed to SQB as the connection
  `name`. The PostgreSQL and Oracle adapters in `@sqb/postgres` and
  `@sqb/oracle` 6.2.1 do not use it, so it does not appear in the
  database's session list.
