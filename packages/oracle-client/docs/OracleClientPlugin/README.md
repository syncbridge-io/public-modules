# OracleClientPlugin

`OracleClientPlugin` installs Oracle Instant Client on a SyncBridge server
and gives it to the workers. An app reaches Oracle through
`@syncbridge/sqb`; the driver answers an Oracle 11 database in Thick mode
only, and Thick mode needs Instant Client. Oracle's license does not let
SyncBridge carry the client in its image or its package, so an admin accepts
the license here and the plugin downloads it from Oracle.

## How it works

1. The plugin is turned on under Settings → Plugins
   (`plugins.oracle-client.enabled`) and the server is restarted.
2. It asks Oracle's license on its card. The answer is kept with who gave it
   and when, so the question is asked once, not at every start. Declined, the
   plugin installs nothing, gives the workers nothing, and says so.
3. Accepted, with no client installed, it downloads the Basic package in the
   background - the server starts meanwhile - and tells its progress on the
   card.
4. It checks that what arrived is an Instant Client package (and its SHA-256,
   when the setting gives one), then unpacks it into `instantclient` under
   the plugin's data directory. Oracle's zip holds one directory; its
   contents are what is installed, so the libraries sit directly in
   `instantclient`.
5. It adds that directory to `LD_LIBRARY_PATH` and
   `instantclient/network/admin` to `TNS_ADMIN` for every worker that starts.
   A worker already running is marked "Restart required" - it takes the
   client when it restarts.
6. Its status then reads `Instant Client <version>`.

A client already installed is given to the workers at the next start without
asking Oracle for anything.

## Oracle's license

The question links to [Oracle's Instant Client
license](https://www.oracle.com/downloads/licenses/instant-client-lic.html).
Read it before accepting: accepting it is what lets this server download the
client, and the engine keeps the record of who accepted it.

To answer it again - a new license version, or a decline you want to take
back - run **Install now**, which asks it anew.

## Settings

| Setting       | Label            | What it does                                                                                                                            | Default         |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `version`     | Version          | The version to install, as Oracle names its download. It is what the status tells and what the default address is built from            | `23.9.0.25.07`  |
| `downloadUrl` | Download address | Where the Basic package is downloaded from. Empty, Oracle's own address for the server's architecture; `{version}` and `{arch}` are replaced in one that is given | Oracle's        |
| `sha256`      | SHA-256          | The checksum Oracle publishes beside the download. Given, a download that does not match it is refused                                  | none            |

Oracle moves its download addresses between versions. A server that fails to
download takes the current address from Oracle's download page and puts it in
`downloadUrl`.

## Actions

| Action              | What it does                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `install`           | Downloads the client again from the address in the settings, and asks Oracle's license again first     |
| `from-file`         | Installs a zip that is already on the server, by its path, or from another address - see [installing without reaching Oracle](installing-without-oracle.md) |
| `remove`            | Deletes the client and takes it back from the workers' environment. They keep it until they restart    |

Only an admin with the settings permission runs them, and the engine's log
tells who ran what.

## libaio

Instant Client links against `libaio`, which belongs to the server rather
than to this plugin: SyncBridge's Docker image carries it, and its Linux
package depends on it. On a host without it the plugin installs the client
and then says that `libaio` is missing instead of giving the workers a client
they cannot load - install `libaio1` (Debian, Ubuntu) or `libaio` (RHEL,
Alma, Rocky) and restart the server.

## What it does not do

The plugin never reads or writes a worker's data, and nothing of it runs in
the browser: its card, its question and its buttons are drawn by SyncBridge.
Uploading the zip through the browser is not available yet; `from-file` takes
a path on the server or an address.
