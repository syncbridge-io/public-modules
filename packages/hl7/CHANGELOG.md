# Changelog


<!-- rman:documented-up-to 645cc7062b2338628dea819b7095621fbb81a535 -->

## @syncbridge/hl7@2.1.0 (2026-10-30)

### ✨ Features

- **hl7:** HL7Endpoint, the abstract base of HL7Client and HL7Server (10614a2)
- **hl7:** names, summaries and settings in Turkish, German, French, Spanish, Italian and Brazilian Portuguese (1c53a7f)
- **hl7:** HL7Client connects through its SOCKS proxy settings (69d346a)

### 🧪 Tests

- **hl7:** wait for the server to see the connection before restarting the client (8fd8bfe)

---

## @syncbridge/hl7@1.2.0 (2026-10-12)

### ✨ Features

- **hl7:** HL7 options as variables, handlers kept on reconfiguration, beforeResponse (f5298b7)

---

## @syncbridge/hl7@1.1.1 (2026-10-11)

### 🐛 Bug Fixes

- **hl7:** adjust dependency ranges for peerDependencies (2756399)
- **extensions:** declare dependencies as ranged peers (a3d8b34)

---

## @syncbridge/hl7@1.1.0 (2026-10-11)

### 🐛 Bug Fixes

- **hl7:** move to hl7v2 and hl7v2-net 2.0 (209a2e7)

---

## @syncbridge/hl7@0.14.14 (2026-10-09)

### 🐛 Bug Fixes

- **hl7:** an HL7 client is started once it connects (d5634c7)

### 🧹 Chores

- **hl7:** release @syncbridge/hl7 again (5f47c44)
- release the extensions in packages/syncbridge again (0293b18)
