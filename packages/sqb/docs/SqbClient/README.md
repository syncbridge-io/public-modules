# SqbClient

`SqbClient` keeps a connection pool to a PostgreSQL, Oracle, SQL Server,
MySQL, MariaDB or SQLite database and
gives an app its [SQB](https://github.com/panates/sqb) client. Use it when
an app reads or writes a relational database. The component checks the
connection when it starts and every 5 seconds after that, so the app's
status shows a database that goes away.

Each database has its driver and its own use of the settings: see
[Database drivers](drivers.md).

## Changing settings

All settings can be changed while the component runs. A change restarts
the component: it closes its client and builds a new one from the new
values.

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

- The driver of the chosen dialect is loaded when the component first
  builds its client, not when the module loads. An unknown dialect fails
  the start with `Unknown database dialect "<dialect>"`.
- The `applicationName` setting is passed to SQB as the connection
  `name`. The SQB 6.3.1 adapters do not use it, so it does not appear in
  the database's session list.
