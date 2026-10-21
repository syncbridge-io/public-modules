# Changelog

<!-- rman:documented-up-to c2091de8418c3e6f28aebd2708433d3dba3645c8 -->

## v2026.10.21-1522 (2026-10-21)

### ✨ Features

- the SyncBridge modules, open sourced under Apache-2.0 - builtins, net, hl7, kafka, redis, sqb, serialport, ngrok, pinggy; built, tested and released from here (4d9623d)
- **builtins,net,hl7,kafka,redis,sqb,serialport,ngrok,pinggy:** require @syncbridge/common 2 (9eebeb9)
- **builtins:** take in the net components: TCP and UDP clients and servers, an HTTP server; @syncbridge/net is gone (d67a96c)

### 🐛 Bug Fixes

- **net:** tell the error that dropped a TCP connection, apply the HTTP protocol options, remove the right listener on start, close open connections on stop (9908783)
- **net,hl7,serialport,sqb,ngrok,pinggy:** list network addresses and serial ports as enum sources of the engine, not at import time; restart in place when values change (176df38)
- **net:** tell UDP bind errors, keep local datagrams and bind the client's own port, block subnets together with addresses, wait for the TLS handshake, tell the error of a lost TCP connection, apply the HTTP socket timeout and header count, label settings rightly (e9e8ede)
- **builtins,net,hl7,kafka,redis,sqb,serialport,ngrok,pinggy:** declare tslib: the compiled code imports it, and SyncBridge installs only what a package declares (f3e0b29)

### 🔧 Refactoring

- **net,hl7,sqb:** build the client or server when the component starts, and restart in place when values change (6490c87)

### 📚 Documentation

- CLAUDE.md - what this repository does, how to work in it, how its modules are written, documented and released (5b3633b)
- the platform's engine runs these modules' sources in development (3ef58f4)
- **net:** the module's README, and a page for each of its components and apps (ad39139)
- **net:** follow the fixes of the module's code (a1bc523)
- **builtins,net,hl7,kafka,redis,sqb,serialport,ngrok,pinggy:** a summary for each component and app, for its card in the Marketplace (b0b8e3f)
- the platform repository is at ~/dev/syncbridge/cloud, beside this one and node-sdk (d517efd)
- the net module is in builtins: README, CLAUDE.md, release and verify matrices (adbb49b)

### 🧪 Tests

- **net,serialport:** the virtual network and serial port of @syncbridge/testing, tested with them here - moved from the platform (7fc3d56)
- **builtins:** peerOf, the communication channel of the IO bases, the IO bridge app (3154cb0)
- **ngrok:** the tunnel's life, retries, stop while opening, data and values changes, with the ngrok agent replaced (11d74e9)
- **pinggy:** the tunnel's life, status polling, errors, stop while opening, data and values changes, with the Pinggy SDK replaced (af45877)

### 🤖 Continuous Integration

- verify every module with spm before a release, and publish the released versions to the SyncBridge registry after the npm publish (b3382c0)
- the registry job runs only when SB_REGISTRY_PUBLISH is true, as the registry's cloud is not deployed; CLAUDE.md follows the platform's release (335ff79)
- remove quality check workflow and update .prettierignore (1845bb2)
- spm verify as rman hooks, before each module's tests and right before spm publishes it, instead of a workflow with a matrix to keep by hand (83ac42d)

### 🧹 Chores

- **builtins,net,hl7,kafka,redis,sqb,serialport,ngrok,pinggy:** a syncbridge-manifest.json for each module, which is what marks it as an extension package for spm verify (89fabaf)
- the repository moved to github.com/syncbridge-io/public-modules (ce111d5)
- take @syncbridge/common 2.0.1 and syncbuild 2.1.0 from npm (4978657)
- publish the modules to the SyncBridge registry with the spm target of rman, not to npm (73c7877)
- drop the changelog markers left from the platform repository: they name a commit this repository does not have, and rman version stopped at it (5d0502f)
- update dependencies: @syncbridge/common 2.0.1 as the modules' peer, the eslint configs and the rman preset (6a26bce)

### 💬 General Changes

- Initial commit (5ab056c)
- the platform's packages taken from its local builds, until it releases them; its problems reported to its session, never worked around (5073a85)
- the SDK is its own repository (syncbridge-io/node-sdk): use-platform-builds.mjs takes its builds from ../node-sdk, CLAUDE.md names the two repositories (d40c36e)
