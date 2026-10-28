---
title: Database drivers
order: 2
---

# Database drivers

`SqbClient` supports every database SQB has a Node.js adapter for. The
`dialect` setting chooses one; each runs on a driver package that SQB
loads.

| Dialect    | Database             | SQB package     | Driver                          |
| ---------- | -------------------- | --------------- | ------------------------------- |
| `postgres` | PostgreSQL           | `@sqb/postgres` | `postgrejs`                     |
| `oracle`   | Oracle               | `@sqb/oracle`   | `oracledb`, a native addon      |
| `mssql`    | Microsoft SQL Server | `@sqb/mssql`    | `mssql` (tedious)               |
| `mysql`    | MySQL                | `@sqb/mysql`    | `mysql2`                        |
| `mariadb`  | MariaDB              | `@sqb/mariadb`  | `mariadb`                       |
| `sqlite`   | SQLite               | `@sqb/sqlite`   | Node.js's built-in `node:sqlite` |

All of them are installed with the module. The component imports only the
SQB package of the chosen dialect, when it first builds its client, so a
worker loads one driver. `oracledb` installs without Oracle software.

SQB's `@sqb/sqljs` adapter, SQLite compiled to WebAssembly, is not offered:
`sqlite` covers SQLite on a server.

## PostgreSQL

Set `host`, `port` (the driver's default applies when empty), `username`,
`password` and `database`. `schema` is passed to the driver as well.

## Oracle

Set `host`, `port`, `username`, `password` and `database`. The component
passes them to `oracledb` as a connect string, `host:port/database`, so
`database` is the service name. The port defaults to 1521. `host` also
accepts `host:port` and `oracle://user:password@host:port/service`; a
user and password in the URL are used when the settings are empty. After
connecting, `schema` is set as the session's current schema.

### Thin and Thick mode

`oracledb` 6 and later runs in Thin mode by default: it speaks the Oracle
protocol itself and needs no Oracle client libraries. Thin mode does not
support every Oracle feature; see the `oracledb` documentation.

`@sqb/oracle` switches to Thick mode when it finds Oracle Client
libraries. When it is imported, it looks for `libclntsh.so` (Linux),
`libclntsh.dylib` (macOS) or `oci.dll` (Windows) in the directories
listed in the `LD_LIBRARY_PATH` and `ORA_HOME` environment variables.
The first directory that has the library is passed to
`oracledb.initOracleClient`. If none has it, the driver stays in Thin
mode.

To use Thick mode:

1. Install Oracle Instant Client on the server.
2. Add its directory to `LD_LIBRARY_PATH` (or set `ORA_HOME`) in the
   environment of the worker's process, before the engine starts.
3. Restart the worker. Thick mode is decided once, when the worker first
   connects to Oracle, and does not change while the process runs.

The environment variable is the only switch: the component has no setting
for it.

## SQL Server

Set `host` (`localhost` when empty), `port` (1433 when empty), `username`,
`password` and `database`. The connection is not encrypted and the
server's certificate is trusted, which suits an on-premises SQL Server
without a trusted certificate. `schema` is not used: name the schema in
the SQL, or give the user a default schema.

## MySQL and MariaDB

Set `host`, `port` (3306 when empty), `username`, `password` and
`database`. `schema` is not used: in MySQL and MariaDB a schema is a
database. Decimal and big integer columns come back as JavaScript numbers.

## SQLite

Set `database` to the path of the database file, or to `:memory:` for a
database in memory. A relative path is resolved against the worker's
working directory. `host`, `port`, `username`, `password` and `schema` are
not used. The connections of one file share one handle, as SQLite has no
pool of its own.

The driver is `node:sqlite`, part of Node.js 22.13 and later; on Node.js
22.12 it needs the `--experimental-sqlite` flag.

## Checking the connection

Start the component. On a failure its status is `unhealthy` with the
message `Database connection failed. <reason>`, and the reason is the
driver's error. Turn on the `queries` log channel to see the SQL that
runs afterwards (see [SqbClient](README.md)).
