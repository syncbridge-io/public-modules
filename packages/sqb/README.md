# @syncbridge/sqb

Database access for SyncBridge apps, built on
[SQB](https://github.com/panates/sqb). The module has one component, a
pooled SQL client for PostgreSQL and Oracle. An app gets the client from
the component and runs its queries; the component tests the connection
and reports its health.

## Components

| Component   | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `SqbClient` | Connection pool to a PostgreSQL or Oracle database, with a `queries` log channel |

## Install

SyncBridge servers install modules from the SyncBridge registry, through
the Marketplace or Console. The module is published there, not on npm:
the 1.0.x versions on npm are old and no longer updated.

It needs `@syncbridge/common`, which the engine provides. `@sqb/builder`,
`@sqb/connect`, `@sqb/oracle`, `@sqb/postgres`, `oracledb` and
`ansi-colors` are installed with it. The component imports both database
drivers when it loads, so `oracledb` is needed even for a PostgreSQL-only
setup. Oracle's native client is optional, see
[Database drivers](https://github.com/syncbridge-io/syncbridge-extensions/blob/main/packages/sqb/docs/SqbClient/drivers.md).

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { SqbClientComponent } from '@syncbridge/sqb';

@App({ displayName: 'Orders' })
export class OrdersApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly db: SqbClientComponent;

  async countOrders() {
    const result = await this.db.getClient().execute('select count(*) from orders');
    return result.rows;
  }
}
```

## Documentation

[docs](https://github.com/syncbridge-io/syncbridge-extensions/tree/main/packages/sqb/docs)
