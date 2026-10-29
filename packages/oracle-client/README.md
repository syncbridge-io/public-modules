# @syncbridge/oracle-client

Oracle Instant Client for a SyncBridge server. This package is a **plugin**,
not a module of components: it does not run in a worker, it prepares the
server. Once an admin has accepted Oracle's license it downloads Instant
Client, installs it beside its own data and adds it to the environment of
every worker, so an app that talks to Oracle through
[`@syncbridge/sqb`](../sqb) finds the client in Thick mode - what Oracle 11
answers in.

Oracle's license does not let SyncBridge carry Instant Client in its Docker
image or in its Linux package, which is why it is installed here, by someone
who accepts that license.

## What it brings

| Plugin               | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `OracleClientPlugin` | Installs Instant Client after the license is accepted and gives it to the workers |

## Install

On a SyncBridge server, install the package from Console, then turn the
plugin on under Settings → Plugins and restart the server. The Marketplace
does not list plugins.

```bash
npm install @syncbridge/oracle-client
```

Peer dependencies: `@syncbridge/common` and `@syncbridge/plugin-api`, both
provided by the engine. `libaio` belongs to the server - the Docker image
carries it, the Linux package depends on it - and the plugin says so when it
is missing.

## Settings

Under `plugins.oracle-client.settings`: the `version` to install, the
`downloadUrl` to take it from (left empty, Oracle's own address for the
server's architecture) and an optional `sha256` to check the download
against.

## Actions

Its card on the Plugins page carries three buttons: **Install now** (which
also asks Oracle's license again), **Install from file** for a server that
does not reach Oracle, and **Remove**.

## Documentation

[docs](https://github.com/syncbridge-io/syncbridge-extensions/tree/main/packages/oracle-client/docs)
