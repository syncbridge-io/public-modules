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

On a SyncBridge server, install the module from the Marketplace or from
Console. It is also on npm:

```bash
npm install @syncbridge/sqb
```

Peer dependencies: `@syncbridge/common` (provided by the engine),
`@sqb/builder`, `@sqb/connect`, `@sqb/oracle`, `@sqb/postgres`,
`oracledb` and `ansi-colors`. The component imports both database
drivers when it loads, so `oracledb` is needed even for a PostgreSQL-only
setup. With npm 7 or later the peers are installed with the package; with
another package manager, install them yourself. Oracle's native client is
optional, see [Database drivers](SqbClient/drivers.md).

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

[docs](https://github.com/panates/syncbridge-public-modules/tree/main/packages/sqb/docs)
