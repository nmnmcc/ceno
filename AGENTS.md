# AGENTS.md

> This file contains project instructions for AI coding assistants. `CLAUDE.md` is a symlink to it.

## General

- **Library usage must be source-verified** — when using any third-party library, read its source code in `references/` to determine the optimal API usage, rather than relying on memory or assumptions. If the library's source is not yet present in `references/`, add it as a git submodule (pinned to a specific commit) before proceeding.
- **Keep `README.md` in sync** — whenever a change affects public API, imports, usage patterns, or examples, update `README.md` to match before considering the task done.
- **Persistent instructions go here** — when the user gives a standing instruction (e.g. "always", "from now on"), write it into this file (`AGENTS.md`) as a rule immediately, before doing any other work. Do not store persistent rules in memory or only acknowledge them verbally.
- **Simple English only in `AGENTS.md`** — all content in this file must be written in Simple English (short sentences, common words, no jargon unless necessary), regardless of the conversation language.

## Package dependencies

- **Understand the domain before touching config** — read this file's project description and the package relationships first. Every decision (dependency categories, exports, build settings) follows from the domain model. Do not start mechanical work before you can explain, from the domain, why each package depends on each other the way it does.
- **Contract packages are `peerDependencies`** — when package B implements or extends package A's service contracts, and consumers import from both A and B, then A must be a `peerDependency` of B (not a regular `dependency`). A regular dependency lets npm install a separate copy, which breaks type identity between the two copies. In this repo: `@ceno/core` is always a `peerDependency` of implementation packages like `@ceno/couchdb`.

## Code Style

- **No `as` type assertions** unless the type system genuinely cannot express the constraint.
- **No conditional spread for optional properties** — use `key: x ?? undefined` instead of `...(x ? { key: x } : {})`.
- **Yieldable errors need no `Effect.fail` wrapper** — `yield* new XxxError()` directly.
- **`index.ts` may contain implementation code**, not just re-exports. Files within the same directory must not import from the directory's own `index.ts`.
- **No `switch/case`** — use Effect `Match` for all value-based branching.
- **Boolean variables** must use `is`/`has`/`should`/`can` prefixes or adjective/past-participle forms.
- **Flat PascalCase modules** — each public module is a PascalCase `.ts` file directly under `src/` (e.g. `src/Server.ts`, `src/Database.ts`). No nested `services/` or `libraries/` sub-folders.
- **`.ts` import extensions** — all relative imports use `.ts` extensions (e.g. `from "./Database.ts"`). The `allowImportingTsExtensions` + `noEmit` tsconfig options enable this.
- **Namespace barrel re-exports** — the main `index.ts` uses `export * as Xxx from "./Xxx.ts"` to create namespace barrels. Consumers can import the namespace from the package barrel (`import { Server } from "@ceno/core"` → `Server.Server` is the service tag) or import directly from a module (`import { Server } from "@ceno/core/Server"`).
- **Wildcard package exports** — `package.json` exports use `"./*": "./src/*.ts"` with `"./internal/*": null` to block internal access. Internal code lives in `src/internal/`.
- **No runtime namespaces** — `erasableSyntaxOnly` is enabled. Do not put runtime values (const, function) inside `namespace` blocks. Type-only namespaces (containing only interfaces/types) are fine and used for service type merging.
- **No cross-package or cross-folder re-exports** — a barrel file (`index.ts`) only re-exports from its own directory's modules, never from another package or a sibling/parent folder. Consumers import each package directly.
- **No imports from own `index.ts`** — files within the same directory must not import from the directory's own `index.ts`. Import directly from siblings.
- **No `let`** — all bindings are `const`.
- **Interface methods use method-signature syntax, not arrow-function properties** — write `name(args): Ret;`, not `readonly name: (args) => Ret;`. This applies to every function member of an `interface` (including nested object-literal members and generic interfaces). Non-function `readonly` properties (values, sub-service objects, data fields) keep `readonly`.
- **No function overloads — keep the API flat, nano-style** — never give a service method more than one overload signature. Give each variant its own name instead: `list`/`listStream`, `find`/`findStream`, `view`/`viewPost`/`viewStream`, `search`/`searchStream`, `changes`/`changesPost`/`changesStream`, `info`/`dbsInfo`/`dbsInfoPost`. This matches the `nano` CouchDB client. The CouchDB layer then wires each name to one endpoint directly, with no `Match` dispatch and no `as never` bridge.
- **No grouped sub-objects for operation families — keep methods flat** — do not nest related operations under a sub-object (`bulk.write`, `index.create`, `attachment.insert`, `partition.info`, `security.get`, `revs.limit.get`, `session.login`, `render.show`). Use flat method names: `bulk`/`bulkGet`, `createIndex`/`listIndexes`/`deleteIndex`, `attachmentInsert`/`attachmentGet`/`attachmentExists`/`attachmentDestroy`, `partitionInfo`/`partitionedList`/`partitionedFind`, `getSecurity`/`setSecurity`, `getRevsLimit`/`setRevsLimit`, `auth`/`session`/`logout`, `show`/`updateHandler`/`viewWithList`. The two allowed scope-narrowing methods are `in(db)` (returns a database-scoped view with the `db` argument dropped) and `partitioned(partition)` (returns a partition-scoped view with short names: `info`/`list`/`find`/`view`/`search`; when called at the top level the methods still need a `db` argument, when chained after `.in(db)` the `db` argument is also dropped). Both may chain: `document.in(db).partitioned(partition)`.
- **TSDoc must tell the reader what feature the code serves** — every export gets a `/** ... */` explaining its product purpose. A reader should never have to reverse-engineer _why_ code exists from the implementation alone. Good: _"Lets users find pages by title within a workspace."_ Bad: _"Implements search CRUD."_ — the second just restates the class name. Interface-layer comments describe what users can do; implementation-layer comments describe non-obvious strategy (e.g. _"on delete, children are re-parented"_). Skip TSDoc on trivial constants and barrel re-exports.

## ceno

ceno is a type-safe CouchDB client built on Effect `HttpApi` (`effect/unstable/httpapi`). Client methods are generated from declarative API definitions; errors are decoded by `HttpApiClient` based on HTTP status codes.

Service contracts are backend-agnostic and live in `@ceno/core`; each backend provides a layer implementation in its own package. `@ceno/couchdb` is the CouchDB-over-HTTP implementation — it is "just one implementation of the `@ceno/core` services layer". A future PouchDB backend would be another implementation of the same `@ceno/core` services.

### Monorepo layout

Yarn workspaces monorepo. Shared tooling (TypeScript, Prettier, effect-tsgo) lives at the root; each package under `packages/` has its own `package.json` and `tsconfig.json` (extends root).

```
packages/
  core/          — @ceno/core, backend-agnostic service interfaces, schemas, errors, stream helpers, schema-aware document operations
  couchdb/       — @ceno/couchdb, the CouchDB HTTP implementation (layers) of the @ceno/core services
```

### Structure

`@ceno/core` — backend-agnostic domain model and service contracts:

```
src/
  Database.ts            — database schemas + Database service contract
  DesignDocument.ts      — design-doc schemas + DesignDocument service contract
  Document.ts            — document schemas + Document service contract
  Errors.ts              — TaggedErrorClass error classes + CenoError/TransportError unions
  LocalDocument.ts       — LocalDocument service contract (reuses Document schemas)
  SchemaDocument.ts      — SchemaDocument: version-migrating typed document operations
  SchemaLocalDocument.ts — SchemaLocalDocument: version-migrating typed local document operations
  Server.ts              — server schemas + Server service contract
  Stream.ts              — NDJSON stream parsing helper
  Version.ts             — public version chain types & constructors (Version, MigrateVersion, version, MigrateError)
  index.ts               — namespace barrel: `export * as Xxx from "./Xxx.ts"`
  internal/
    version.ts           — migrate, toSchema, isMigrateVersion — version chain implementation details
    index.ts             — barrel re-exports for internal/
```

Each domain file is self-contained: its response/param schemas and its `Context.Service` tag + interface live together (contracts only, no implementation). `SchemaDocument` and `SchemaLocalDocument` combine a service with a version chain for typed operations that encode on writes and migrate on reads. The `internal/` folder holds implementation details blocked from external access via `"./internal/*": null` in package exports.

`@ceno/couchdb` — CouchDB HTTP implementation of the `@ceno/core` services:

```
src/
  Client.ts          — CouchDbClient service class + layer factory
  CouchDB.ts — merged layer of all scope layers
  Database.ts        — Database Api (standalone HttpApi) + layer
  DesignDocument.ts  — DesignDocument Api + layer
  Document.ts        — Document Api + layer
  Errors.ts          — Wire schemas bridging CouchDB error format to @ceno/core error classes
  LocalDocument.ts   — LocalDocument Api + layer
  Server.ts          — Server Api + layer
  index.ts           — namespace barrel: `export * as Xxx from "./Xxx.ts"`
```

Each domain file is self-contained: its endpoints, its standalone `HttpApi`, and its `Layer` implementation live together as module-level exports (no runtime namespaces). There is no combined `CouchDbApi` — each scope is an independent `HttpApi`, mutually non-interfering.

### Endpoint conventions

- Each scope is its own standalone `HttpApi`, **not** combined into one. Each module exports `Api` as a module-level const, built as `Api = HttpApi.make("<scope>").add(HttpApiGroup.make("<scope>", { topLevel: true }).add(...endpoints))`
- `topLevel: true` flattens the single group so the generated client exposes endpoint methods directly (`client.info()`, not `client.server.info()`)
- Only include Wire schemas in an endpoint's `error` array for errors that endpoint actually returns
- Streaming endpoints use `HttpApiSchema.StreamUint8Array()`

### Error mapping

Each CouchDB error code maps to a pair: `CenoXxx` (TaggedErrorClass in `@ceno/core`'s `errors.ts`, for `catchTag`) + `CenoXxxWire` (Wire schema in `@ceno/couchdb`'s `errors.ts`, for the HttpApiEndpoint `error` array).

Wire schemas bridge CouchDB wire format `{"error":"xxx","reason":"..."}` to TaggedErrorClass encoded form `{"_tag":"CenoXxx","reason":"..."}` via `Schema.decodeTo` + `SchemaGetter.transform`.

| Class                     | CouchDB `error`         | HTTP status |
| ------------------------- | ----------------------- | ----------- |
| `CenoIllegalDatabaseName` | `illegal_database_name` | 400         |
| `CenoBadRequest`          | `bad_request`           | 400         |
| `CenoUnauthorized`        | `unauthorized`          | 401         |
| `CenoForbidden`           | `forbidden`             | 403         |
| `CenoNotFound`            | `not_found`             | 404         |
| `CenoConflict`            | `conflict`              | 409         |
| `CenoAlreadyExists`       | `file_exists`           | 412         |
| `CenoBadContentType`      | `bad_content_type`      | 415         |
| `CenoInternalServerError` | `internal_server_error` | 500         |

When multiple errors share a status code (e.g. 400 has both `illegal_database_name` and `bad_request`), `HttpApiClient` disambiguates via `Schema.Union` + the `Schema.Literal` value on the `error` field.

### Client usage

`CouchDB.layer` provides every `@ceno/core` service backed by CouchDB's HTTP API; it requires a `CouchDbClient`, supplied by `Client.layer(config)` (which in turn needs an `HttpClient`, supplied by the caller — ceno is transport-agnostic and bundles no `HttpClient`). Consume the individual service tags (`Server.Server`, `Database.Database`, `Document.Document`, …) from your program. To wire a single scope only, provide its scope's `layer` (e.g. `import { Server } from "@ceno/couchdb"` → `Server.layer`) instead of the merged `CouchDB.layer`.

```typescript
import { Database, Document, Server } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Redacted } from "effect";

const program = Effect.gen(function* () {
  const server = yield* Server.Server;
  const database = yield* Database.Database;
  const document = yield* Document.Document;

  const info = yield* server.info;
  yield* database.create("mydb");

  // pass db on every call
  const doc = yield* document.get("mydb", "abc");

  // or scope to a database with .in(db) to avoid repeating the name
  const mydb = document.in("mydb");
  const doc2 = yield* mydb.get("abc");
});

program.pipe(
  Effect.provide(CouchDB.layer),
  Effect.provide(
    Client.layer({ url: "http://localhost:5984", username: "admin", password: Redacted.make("password") }),
  ),
  // ...plus an `HttpClient` layer of your choice — ceno provides none
  Effect.runPromise,
);
```

### Adding an endpoint

1. Check https://docs.couchdb.org/en/stable/api/index.html for the endpoint path, method, params, success response, and all HTTP error status codes
2. If a new CouchDB error code is needed: add a `CenoXxx` class in `@ceno/core/Errors.ts` + a `CenoXxxWire` wire schema in `@ceno/couchdb/Errors.ts`
3. Add the response Schema + service method to the matching `@ceno/core` module (`Server.ts` / `Database.ts` / `Document.ts` / `DesignDocument.ts` / `LocalDocument.ts`); then in the matching `@ceno/couchdb` module (same name), add the `.add()` endpoint to that scope's `Api` and wire the method through in `layer`
