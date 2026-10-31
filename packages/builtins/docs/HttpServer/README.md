# HttpServer

`HttpServer` listens for HTTP requests, or HTTPS when TLS is on. It creates
a Node.js `http.Server` (`https.Server` with TLS) and gives it to the app as
`server`. The app handles the requests: it adds a `request` listener and
answers. The component takes care of listening, stopping with keep-alive
clients connected, TLS, and a record of each request and response in the
communication log.

It extends
[`IoServer`](../guides/io-server.md)
of `@syncbridge/builtins`, and its settings extend those of
[`TcpServer`](../TcpServer/README.md). Its class is `HttpServerComponent`.

## Changing settings

It has the settings of [TcpServer](../TcpServer/README.md), with the same
rules, and adds the HTTP protocol options (`http`). None of them is live: a
change restarts the worker.

The `http` object is merged into the options of `http.createServer()` /
`https.createServer()`. Node.js reads `requestTimeout`, `headersTimeout`,
`keepAliveTimeout`, `keepAliveTimeoutBuffer`, `maxHeaderSize` and
`connectionsCheckingInterval` from them. `timeout` and `maxHeadersCount`
are properties of a server, not creation options, so the component sets
them on the server after it creates it.

## Events

The component emits none of its own. It does not emit `data` or `transmit`.
Listen to the Node.js server:

```ts
this.web.server.on('request', (req, res) => { /* ... */ });
```

`error` is inherited.

## Methods

`write()` throws, as it does on any `IoServer` that does not override it:
`"HttpServerComponent" component do not support write operations.` Answer a
request on its `res`.

## Communication log

The component declares its own `communication` channel, replacing the base
one: description "The requests it is sent and what it answers", off by
default, retention 14 days. It takes the events `request` and `response`.

| When                              | `direction` | `event`    | `message`                                | `details`      |
| --------------------------------- | ----------- | ---------- | ---------------------------------------- | -------------- |
| a request is received             | `in`        | `request`  | `<METHOD> <url>`, for example `POST /orders?id=1` | `address:port` |
| the response is finished          | `out`       | `response` | `<status> <METHOD> <url> (<n> ms)`, for example `201 POST /orders?id=1 (12 ms)` | `address:port` |

The bodies of the requests and responses are not written. A response that
is aborted before it finishes has no `response` record.

## Dashboard

The `connections` dashboard is inherited from [IoServer](../guides/io-server.md#dashboard). `HttpServer` serves requests, not connections, so it stays empty: an app has no reason to take it.

## Status

| Status    | When                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| `started` | The server is listening.                                                      |
| `stopped` | After a stop. All connections, keep-alive ones too, are closed (`closeAllConnections`). |

The start fails, and its error is reported, when the server cannot listen.

When the server is listening, the component logs `Http listener started on`
the URL.

## Example

```ts
import { App, AppBase } from '@syncbridge/common';
import { HttpServerComponent } from '@syncbridge/builtins';

@App({ displayName: 'Webhook Receiver' })
export class WebhookApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly web: HttpServerComponent;

  protected async _init(): Promise<void> {
    await super._init();
    this.web.server.on('request', (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        console.log(req.method, req.url, Buffer.concat(chunks).toString());
        res.statusCode = 204;
        res.end();
      });
    });
  }
}
```

## Notes

- Settings are read when the component is created, as in `TcpServer`. None
  of them is live: a change of any setting restarts the worker.
- The `socket` options of `TcpServer` and its block lists are put into the
  creation options of the HTTP server too.
- The log line on start shows the address as `<bindInterface or localhost>:<port>`
  after the scheme, for example `http://localhost:8080`.
