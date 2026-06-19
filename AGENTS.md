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
- **Prefer `export * from "..."`** in barrel files over listing individual exports.
- **No cross-package or cross-folder re-exports** — a barrel file (`index.ts`) only re-exports from its own directory's modules, never from another package or a sibling/parent folder. Consumers import each package directly.
- **No deep imports across folder boundaries** — when importing from another folder that has an `index.ts`, import from the barrel (e.g. `../libraries`), never from an internal file (e.g. `../libraries/version`). Within the same folder, import directly from siblings (existing rule: never from the directory's own `index.ts`).
- **No `let`** — all bindings are `const`.
- **TSDoc must tell the reader what feature the code serves** — every export gets a `/** ... */` explaining its product purpose. A reader should never have to reverse-engineer _why_ code exists from the implementation alone. Good: _"Lets users find pages by title within a workspace."_ Bad: _"Implements search CRUD."_ — the second just restates the class name. Interface-layer comments describe what users can do; implementation-layer comments describe non-obvious strategy (e.g. _"on delete, children are re-parented"_). Skip TSDoc on trivial constants and barrel re-exports.

## ceno

ceno is a type-safe CouchDB client built on Effect `HttpApi` (`effect/unstable/httpapi`). Client methods are generated from declarative API definitions; errors are decoded by `HttpApiClient` based on HTTP status codes.

Service contracts are backend-agnostic and live in `@ceno/core`; each backend provides a layer implementation in its own package. `@ceno/couchdb` is the CouchDB-over-HTTP implementation — it is "just one implementation of the `@ceno/core` services layer". A future PouchDB backend would be another implementation of the same `@ceno/core` services.

### Monorepo layout

Yarn workspaces monorepo. Shared tooling (TypeScript, Prettier, effect-tsgo) lives at the root; each package under `packages/` has its own `package.json` and `tsconfig.json` (extends root).

```
packages/
  core/          — @ceno/core, backend-agnostic service interfaces, schemas, errors, stream helpers
  couchdb/       — @ceno/couchdb, the CouchDB HTTP implementation (layers) of the @ceno/core services
  version/       — @ceno/version, schema versioning & migration helpers
```

### Structure

`@ceno/core` — backend-agnostic domain model and service contracts:

```
src/
  services/
    errors.ts              — TaggedErrorClass error classes + CenoError/TransportError unions
    server.ts              — server schemas + Server service contract
    database.ts            — database schemas + Database service contract
    document.ts            — document schemas + Document service contract
    design-document.ts     — design-doc schemas + DesignDocument service contract
    local-document.ts      — LocalDocument service contract (reuses document schemas)
    schema-document.ts     — SchemaDocument: version-migrating typed document operations
    schema-local-document.ts — SchemaLocalDocument: version-migrating typed local document operations
    index.ts               — barrel re-exports for services/
  libraries/
    stream.ts              — NDJSON stream parsing helper
    version.ts             — schema versioning & migration
    index.ts               — barrel re-exports for libraries/
  index.ts                 — barrel re-exports (services + libraries)
```

Each domain file is self-contained: its response/param schemas and its `Context.Service` tag + interface live together (contracts only, no implementation).

`@ceno/couchdb` — CouchDB HTTP implementation of the `@ceno/core` services. Mirrors `@ceno/core`'s per-domain file layout; each domain file holds both its standalone `HttpApi` definition and its `@ceno/core` service `Layer`:

```
src/
  services/
    errors.ts          — Wire schemas bridging CouchDB error format to @ceno/core error classes
    client.ts          — CouchDbClient: factory service deriving an auth-applied client for any HttpApi
    server.ts          — ServerApi (standalone HttpApi) + CouchDbServer.layer
    database.ts        — DatabaseApi + CouchDbDatabase.layer
    document.ts        — DocumentApi + CouchDbDocument.layer
    design-document.ts — DesignDocumentApi + CouchDbDesignDocument.layer
    local-document.ts  — LocalDocumentApi + CouchDbLocalDocument.layer
    index.ts           — barrel re-exports for services/
  index.ts             — barrel re-exports + the merged `layer`
```

Each domain file is self-contained: its endpoints, its standalone `HttpApi`, and its `Layer` implementation live together. There is no combined `CouchDbApi` — each scope is an independent `HttpApi`, mutually non-interfering.

### Endpoint conventions

- Each scope is its own standalone `HttpApi`, **not** combined into one: `ServerApi`, `DatabaseApi`, `DocumentApi`, `DesignDocumentApi`, `LocalDocumentApi`, each built as `XxxApi = HttpApi.make("<scope>").add(HttpApiGroup.make("<scope>", { topLevel: true }).add(...endpoints))`
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

The package-level `layer` provides every `@ceno/core` service backed by CouchDB's HTTP API; it requires a `CouchDbClient`, supplied by `CouchDbClient.layer(config)` (which in turn needs an `HttpClient`, supplied by the caller — ceno is transport-agnostic and bundles no `HttpClient`). Consume the individual service tags (`Server`, `Database`, `Document`, …) from your program. To wire a single scope only, provide its `XxxLayer` (e.g. `ServerLayer`) instead of the merged `layer`.

```typescript
import { Database, Document, Server } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Redacted } from "effect";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;

  const info = yield* server.info;
  yield* database.create("mydb");
  const doc = yield* document.get("mydb", "abc");
});

program.pipe(
  Effect.provide(layer), // all five services; requires CouchDbClient
  Effect.provide(
    CouchDbClient.layer({ url: "http://localhost:5984", username: "admin", password: Redacted.make("password") }),
  ),
  // ...plus an `HttpClient` layer of your choice — ceno provides none
  Effect.runPromise,
);
```

### Adding an endpoint

1. Check https://docs.couchdb.org/en/stable/api/index.html for the endpoint path, method, params, success response, and all HTTP error status codes
2. If a new CouchDB error code is needed: add a `CenoXxx` class in `@ceno/core`'s `errors.ts` + a `CenoXxxWire` wire schema in `@ceno/couchdb`'s `errors.ts`
3. Add the response Schema + service method to the matching `@ceno/core` domain file (`server.ts` / `database.ts` / `document.ts` / `design-document.ts` / `local-document.ts`); then in the matching `@ceno/couchdb` domain file (same name), add the `.add()` endpoint to that scope's `XxxApi` and wire the method through in `XxxLayer`
