# TLS and proxies

## TLS

Turn on `tls_enabled` and fill `tls`. The connection is made first, then
wrapped in TLS with Node's `tls.connect()`: the values of `tls` are passed
to it as they are.

- `rejectUnauthorized` is `true` by default. A server whose certificate the
  trusted CAs do not vouch for is rejected.
- `ca` replaces the built-in list of well-known CAs. Put the CA that signed
  the server's certificate there when the server uses a private CA.
- `servername` sets the SNI name. Set it when you connect by IP address to a
  server that picks its certificate by name.
- `key` and `cert` are the client's certificate, for servers that ask for
  one. The profile editor marks `key`, `cert` and `ca` as required.
- `passphrase` decrypts an encrypted `key`.

All values are PEM text, not file paths.

The component reports `connect` and the status `started` when the TCP
connection is up, before the TLS handshake ends.

## SOCKS proxy

Turn on `proxy_enabled` and fill `proxy`. The component connects to the
proxy and asks it to connect to `host:port`. `proxyType` is `v5` by default,
`v4` is the other choice. `username` and `password` are given to the proxy for
authentication.

With a proxy:

- `bindInterface` and `connectTimeout` are applied to the connection to the
  proxy.
- `keepAlive` is not applied.
- TLS, when on, runs through the proxy, end to end with the target.

## Reconnecting

The component retries without end. Watch `reconnecting` to see the delays,
and set `maxDelay` to how long you can accept an outage to last before the
next attempt.
