# CLAUDE.md

## Project

The open source modules of **SyncBridge** (Apache-2.0). SyncBridge is a
runtime that runs apps as single-process workers, lighter than containers,
managed centrally from SyncBridge Console. A **module** is an npm package
of **components** (clients, servers, connections) and **apps** (what a
worker runs, made of components), written in TypeScript against
`@syncbridge/common`.

This repository does three things:

1. **Develop** the modules in `packages/*`: `builtins`, `hl7`,
   `kafka`, `redis`, `sqb`, `serialport`, `ngrok`, `pinggy`.
2. **Document** them, so a developer can use each one and learn from it
   how to build modules of their own. These are the reference examples of
   the platform: keep them clean, idiomatic and well tested.
3. **Release** them with a `release.yml` that publishes to the SyncBridge
   registry with `spm` (`@syncbridge/syncbuild`), so they appear in the
   Marketplace and can be installed on SyncBridge servers.

The SyncBridge platform lives in two other repositories, both worked on by
one Claude session named **`syncbridge`**: the **SDK** (`@syncbridge/common`,
`runtime`, `syncbuild`, `testing`, `plugin-api`), public, `syncbridge-io/node-sdk`
at `/Users/ehanoglu/dev/syncbridge/node-sdk`, and the private rest (engine,
Console, registry), `syncbridge-io/syncbridge`, at
`/Users/ehanoglu/dev/syncbridge/syncbridge`. See "The platform" below.

## Layout

- `packages/<name>/src`: the module's code, `index.ts` its entry point.
  Components in `src/components/<name>.component.ts`, their values (the
  settings shown in the UI) in `<name>.variables.ts` beside them; apps in
  `src/apps`.
- `packages/<name>/test`: mocha tests (`*.spec.ts`).
- Root: pnpm workspaces (`pnpm-workspace.yaml`), `rman`
  (`@panates/rman-preset`) for build, lint,
  check, versions and changelogs - a root devDependency, `>= 2.39`: an older
  rman does not read `pnpm-workspace.yaml`, finds no packages and succeeds
  over none, and `pnpm build` then runs itself without end; `tsconfig-base.json`,
  `tsconfig-build.json`, `tsconfig-test.json`, `.mocharc.cjs`.
- Modules depend on each other as **npm peer dependencies**
  (`@syncbridge/hl7` peers `@syncbridge/builtins`),
  and on `@syncbridge/common` as a peer: the engine provides it.

## The platform

**Its packages come from npm**: `@syncbridge/common` (a peer of every
module), and `@syncbridge/syncbuild` (`spm`) and `@syncbridge/testing` as root
devDependencies, all `^2.0.0`. When a change needs platform code that is not
released yet, take the platform's local builds for as long as it takes:

```bash
node support/use-platform-builds.mjs
```

It packs `@syncbridge/common`, `runtime`, `testing` and `syncbuild` from
the SDK repository's `packages/<name>/build` and unpacks each over the copy
pnpm materialized in `node_modules/.pnpm`, so every link into it sees the
build and there is one `@syncbridge/common`, leaving `package.json` and the
lockfile untouched; run it after every `pnpm install`, and
`pnpm install --force` brings the registry's versions back.
`SB_PLATFORM_DIR` points it elsewhere than `../node-sdk`. Never commit a change that needs
an unreleased version to install.

The other way round, the platform's engine runs these modules in
development from this repository's sources (its `tsconfig.json` maps
`@syncbridge/*` to `../../../../public-modules/packages/*/src`, a sibling): keep
this directory named `public-modules`, beside `cloud` and `node-sdk`, and keep `main`'s modules working,
as the engine's development uses them.

**A problem or a gap on the platform's side is reported, never worked
around.** When `@syncbridge/common`, `spm`, `@syncbridge/testing`, the
registry, Console or the engine is missing something, behaves wrongly, or
its build is missing or stale:

1. Stop that line of work. Do not invent a temporary fix: no local patch
   of a platform package, no copy of its code here, no shim, no `any` cast
   to get past it, no edit in the platform repository.
2. Tell the platform's session: find it with `ListAgents` (named
   `syncbridge`) and `SendMessage` it. Say what you were doing, what you
   expected, what happened (the exact error, command, file and line), and
   what you need - a fix, a feature, or a fresh build.
3. Tell the user you did, and go on with work that does not depend on it.
   When the platform's session answers that it is done, run
   `node support/use-platform-builds.mjs` again and continue.

## Commands

```bash
pnpm install
node support/use-platform-builds.mjs
pnpm test         # tsc -b tsconfig-test.json, then mocha (all modules)
rman run test     # each module: spm verify, then its tests (CI runs this)
pnpm build        # rman build: each module into packages/<name>/build
rman lint
rman check        # circular dependencies, package sanity
pnpm exec prettier --check .
```

Definition of done for a code change: `pnpm test`, `rman lint`,
`rman check` and prettier all pass.

## How to work here

- **Language:** talk to the user in **Turkish**. Code, comments, commit
  messages, documentation and this file are in **English**.
- **Comments and naming:** match the surrounding code: short comments that
  say why, not what.
- **Plan first:** for a new feature or anything that changes how modules
  are released, give a plan and get it agreed before coding.
- **Commits:** commit each finished step. Message =
  `<type>(<scope>): <summary>` where type is one of `feat`, `fix`,
  `refactor`, `chore`, `dev`, `test`, `docs`, `style`, `perf`, and scope is
  the module (`feat(hl7): ...`). The types decide the next versions: a
  `feat` is a minor release of that module, a `fix` a patch, `!` major.
- **Push:** ask before every `git push`; push with `--follow-tags`.
  Before pushing, run `rman deps`. When it lists newer versions, upgrade
  the manifests with `rman deps -u`, run `pnpm install`, and run the
  definition of done again (`pnpm test`, `rman lint`, `rman check`,
  prettier); commit the upgrade as `chore: ...` before the push.
- **Secrets:** never print a token, key or password, never commit one.
  This repository is public.
- **Found a bug or something odd in passing?** Tell the user; don't fix it
  silently or route around it.
- No backward-compatibility shims: prefer the clean solution.

## Writing a module

- A component extends `ComponentBase` with `@Component({ className })`;
  an app extends `AppBase` with `@App(...)` and declares its components
  with `@App.UseComponent()`. Values are a class of `@DefineVariable`
  fields, attached with `@Component.UseVariables(...)` /
  `@App.UseVariables(...)`; secrets use `VariableType.Secret`.
- What a component sends and receives goes to its communication **log
  channel** (`LogChannel`), so it can be watched in the UI: keep that
  behaviour in new components, and test it.
- A worker loads only its app's and components' code: keep modules free of
  side effects at import time.
- npm packages a module's code imports at run time go in
  `peerDependencies` when the engine or another module provides them
  (`@syncbridge/common`, another `@syncbridge/*` module), otherwise in
  `dependencies`. `spm verify` catches an undeclared one.
- Terminology: "app" (never "applet"), "module", "component"; SyncBridge
  itself is "the engine".

## Documenting a module

`spm` packs `docs/` into the package and the registry shows it in the
Marketplace and Console (it is stripped from what servers install):

- `docs/<ClassName>/README.md` is that app's or component's page;
  other files beside it are its guides (device setup, network, ...).
- The rest of `docs/` is the package's own.
- Markdown (256 KB), PDF (20 MB), png/jpg/gif/webp/svg (5 MB); 50 MB in all.
- Languages: `name.md` is the package's language (`docsLanguage` in the
  manifest, default `en`); others are `name.tr.md`, `name.pt-BR.md`. All
  languages of a document share its name. This rule never changes.
- Optional `sidebar.json` (in `docs/` or `docs/<ClassName>/`) orders and
  titles them; otherwise front matter `title` / `order`.
- Links are relative inside `docs/`; outside it only http(s) and mailto.

The full rules are in the `@syncbridge/syncbuild` README on npm. Each
module's `README.md` (root of the package) stays the npm page: what it is,
install, a short example, link to its docs.

## Releasing

- Versions: `rman` from Conventional Commits; a merge to `main` releases
  the modules changed since (see `.github/workflows/release.yml`).
- `.github/workflows/release.yml`: `test`, then the release (`rman`:
  version, build, publish, GitHub Release).
- `spm verify` (a module packed, installed as the engine does and its
  classes loaded in a worker) is a hook of rman in `.rmanrc.yml`, so it
  follows the packages by itself: `run.test.before` runs it before each
  module's tests (`rman run test`, as CI does), and `publish.spm.before`
  right before spm publishes a module - only the modules being released. A
  module that fails it is not published; as the version is bumped by then,
  the fix goes out as the next version.
- **The modules are published to the SyncBridge registry, not to npm**: its
  `spm` publish target is set in `.rmanrc.yml` (`publish.target: [spm]`,
  rman >= 2.32.0 and `@syncbridge/syncbuild` >= 2.2.0 as the root
  devDependency). `rman publish` asks the registry (`spm view`) which version
  a module lacks and publishes it with the repository's own `spm`; in GitHub
  Actions spm publishes as the job with its OIDC token, no secret, so the job
  needs `id-token: write`. The organization owning the `@syncbridge` scope
  must trust this repository in Console (Trusted publishers), with "CI may
  create packages" on for the first publish; a package then stays bound to
  it. A release that failed at publishing is finished by running the workflow
  again. The engine's image installs the builtins from the registry. The old
  npm versions stay, deprecated, pointing at the registry; the SDK packages
  (`@syncbridge/common` and the others) stay on npm.
- The first release bumps all eight modules: the published 1.0.x builds are
  stale against `@syncbridge/common` 2.

## State when this repository was started (2026-10-19)

- The modules were moved here from the platform repository's
  `packages/extensions`, without history. They are already on npm
  (`@syncbridge/builtins` 1.0.4, ...), then licensed UNLICENSED.
- They needed an `@syncbridge/common` newer than npm's 1.1.4; the platform
  released 2.0.0, and the modules' peer ranges and the root devDependencies
  follow it.
- `@syncbridge/net` was folded into `@syncbridge/builtins` (2026-10-20): its
  components are `@syncbridge/builtins:TcpClient` and so on now. The package
  is gone; its last npm version is to be deprecated by the user.
- The platform's `@syncbridge/testing` tests of the virtual network and
  serial port moved here: `packages/builtins/test/virtual-network.spec.ts` and
  `packages/serialport/test/virtual-serial.spec.ts`, with their
  `_fixtures/echo-ext` / `serial-ext`. They are also the example of how to
  test a module with `@syncbridge/testing` (import it before the module
  under test).
- The repository is public, at `github.com/syncbridge-io/syncbridge-extensions`
  (renamed from `public-modules` on 2026-10-28; this directory keeps the old
  name, see "The platform"). The registry's trusted publisher matches the
  repository by name: it has to name `syncbridge-extensions` for a release to
  publish. Not done yet: deprecating the old npm versions.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
