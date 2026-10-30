---
title: Installing without reaching Oracle
order: 2
---

# Installing without reaching Oracle

A server behind a firewall, or one on a network that does not reach
`download.oracle.com`, cannot fetch Instant Client itself. The plugin then
takes the package from somewhere you can reach.

## From a file on the server

1. On a machine that reaches Oracle, download **Instant Client Basic** for
   the server's architecture (`linux.x64` or `linux.arm64`) from Oracle's
   Instant Client download page. Accept Oracle's license there as well: it is
   the same license the plugin asks about.
2. Copy the zip into the plugin's data directory on the server -
   `/var/lib/syncbridge/plugins/oracle-client/instantclient-basic.zip` on a
   server installed from the Linux package, say. The engine lets the plugin
   read that directory alone: given a path elsewhere, the action says so and
   names the directory.
3. On the plugin's card, run **Install from file** and give that path.

The plugin checks the zip, unpacks it and gives it to the workers as it does
with its own download. Nothing leaves the server.

## Not from another address

The plugin downloads from Oracle alone: **Install from file** takes a path on
the server, not an address, and no setting names another host. A zip kept in
an internal artifact store is copied to the server first.

## The license still has to be accepted

Installing from a file does not skip the question: the plugin asks Oracle's
license before it installs anything, whatever the package comes from. A
declined license leaves the action telling you so and nothing installed.
