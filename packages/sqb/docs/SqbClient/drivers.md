---
title: Database drivers
order: 2
---

# Database drivers

`SqbClient` supports two dialects, chosen with the `dialect` setting.
Each one runs on a driver package that SQB loads.

| Dialect    | SQB package      | Driver                                  |
| ---------- | ---------------- | --------------------------------------- |
| `postgres` | `@sqb/postgres`  | `postgrejs`, a dependency of `@sqb/postgres` |
| `oracle`   | `@sqb/oracle`    | `oracledb`, a peer dependency           |

The module imports both SQB packages when it loads. `oracledb` must
therefore be installed even when only PostgreSQL is used. It installs
without Oracle software.

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
libraries. When the module loads, it looks for `libclntsh.so` (Linux),
`libclntsh.dylib` (macOS) or `oci.dll` (Windows) in the directories
listed in the `LD_LIBRARY_PATH` and `ORA_HOME` environment variables.
The first directory that has the library is passed to
`oracledb.initOracleClient`. If none has it, the driver stays in Thin
mode.

To use Thick mode:

1. Install Oracle Instant Client on the server.
2. Add its directory to `LD_LIBRARY_PATH` (or set `ORA_HOME`) in the
   environment of the worker's process, before the engine starts.
3. Restart the worker. Thick mode is decided once, at import time, and
   does not change while the process runs.

The environment variable is the only switch: the component has no setting
for it.

## Checking the connection

Start the component. On a failure its status is `unhealthy` with the
message `Database connection failed. <reason>`, and the reason is the
driver's error. Turn on the `queries` log channel to see the SQL that
runs afterwards (see [SqbClient](README.md)).
