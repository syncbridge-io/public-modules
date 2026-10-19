---
title: Connection settings
order: 1
---

# Connection settings

KafkaProducer and KafkaConsumer share the group of settings named
Connection (`connection`). It tells how to reach the brokers.

| Setting            | Key               | Description                                                                                                         | Default | Required |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| Brokers            | `brokers`         | Seed brokers (list of `host:port`). They are used to bootstrap the client and load the initial metadata.            |         | Yes      |
| Client id          | `clientId`        | Logical identifier of the app; brokers can use it for quotas and tracing. If empty, the component's path is used.   |         | No       |
| Timeout            | `timeout`         | Timeout in seconds for Kafka requests that support the parameter.                                                   | 5       | No       |
| Retries            | `retries`         | Times to retry an operation before it fails. `-1` retries without limit.                                            | 3       | No       |
| Retry Delay        | `retryDelay`      | Seconds to wait between retries.                                                                                    | 1       | No       |
| Metadata Max Age   | `metadataMaxAge`  | Maximum lifetime of cluster metadata, in seconds.                                                                   | 5       | No       |
| Connect timeout    | `connectTimeout`  | Client connection timeout in seconds.                                                                               | 5       | No       |
| Request timeout    | `requestTimeout`  | Local timeout in seconds while waiting for the response to a request in flight.                                     | 30      | No       |
| Max Inflights      | `maxInflights`    | Requests to send in parallel without waiting for responses, when the protocol allows it.                            | 5       | No       |
| SASL Enabled       | `sasl_enabled`    | Authenticate with SASL.                                                                                             |         | No       |
| SASL               | `sasl`            | SASL options, used when SASL is enabled. See below.                                                                 |         | No       |
| TLS Enabled        | `tls_enabled`     | Use TLS for the broker connections.                                                                                 |         | No       |
| TLS                | `tls`             | TLS options, used when TLS is enabled. See below.                                                                   |         | No       |

## SASL

| Setting             | Key         | Description                                                                         | Default | Required |
| ------------------- | ----------- | ----------------------------------------------------------------------------------- | ------- | -------- |
| Mechanism           | `mechanism` | `PLAIN`, `SCRAM-SHA-256`, `SCRAM-SHA-512`, `OAUTHBEARER` or `GSSAPI`.               | `PLAIN` | Yes      |
| Username            | `username`  | Used by `PLAIN`, `SCRAM-SHA-256` and `SCRAM-SHA-512`.                               |         | No       |
| Password (secret)   | `password`  | Used by `PLAIN`, `SCRAM-SHA-256` and `SCRAM-SHA-512`.                               |         | No       |
| Token (secret)      | `token`     | Token, for example an AWS session token.                                            |         | No       |

## TLS (`tls`)

| Setting              | Key                  | Description                                                                                         | Default | Required |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------- | ------- | -------- |
| SNI                  | `servername`         | Server Name Indication. It is also given to the client as the TLS server name.                      |         | No       |
| Key                  | `key`                | Private key in PEM format.                                                                          |         | No       |
| Cert                 | `cert`               | Certificate chain in PEM format.                                                                    |         | No       |
| CA certificates      | `ca`                 | Overrides the trusted CA certificates. Mozilla's well-known CAs are replaced when it is set.        |         | No       |
| Passphrase (secret)  | `passphrase`         | Passphrase to decrypt the private key.                                                              |         | No       |
| Reject unauthorized  | `rejectUnauthorized` | Reject a connection to a broker not authorized by the supplied CAs.                                 | true    | No       |

## Changing settings

All connection settings can change while the component runs. The component
then closes its client and creates a new one; if it was running, it starts
again; while it starts, its status is `starting`. A component that is stopped stays stopped.
