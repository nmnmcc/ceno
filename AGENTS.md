# AGENTS.md

> This file contains project instructions for AI coding assistants. `CLAUDE.md` is a symlink to it.

## General

- **Library usage must be source-verified** — when using any third-party library, read its source code in `references/` to determine the optimal API usage, rather than relying on memory or assumptions. If the library's source is not yet present in `references/`, add it as a git submodule (pinned to a specific commit) before proceeding.

## Code Style

- **No `as` type assertions** unless the type system genuinely cannot express the constraint.
- **No conditional spread for optional properties** — use `key: x ?? undefined` instead of `...(x ? { key: x } : {})`.
- **Yieldable errors need no `Effect.fail` wrapper** — `yield* new XxxError()` directly.
- **`index.ts` may contain implementation code**, not just re-exports. Files within the same directory must not import from the directory's own `index.ts`.
- **No `switch/case`** — use Effect `Match` for all value-based branching.
- **Boolean variables** must use `is`/`has`/`should`/`can` prefixes or adjective/past-participle forms.
- **Prefer `export * from "..."`** in barrel files over listing individual exports.
- **No `let`** — all bindings are `const`.
- **TSDoc must tell the reader what feature the code serves** — every export gets a `/** ... */` explaining its product purpose. A reader should never have to reverse-engineer _why_ code exists from the implementation alone. Good: _"Lets users find pages by title within a workspace."_ Bad: _"Implements search CRUD."_ — the second just restates the class name. Interface-layer comments describe what users can do; implementation-layer comments describe non-obvious strategy (e.g. _"on delete, children are re-parented"_). Skip TSDoc on trivial constants and barrel re-exports.

## neno

neno is a type-safe CouchDB client built on Effect `HttpApi` (`effect/unstable/httpapi`). Client methods are generated from declarative API definitions; errors are decoded by `HttpApiClient` based on HTTP status codes.

### Structure

Organized by domain. Each domain file contains its own schemas, param interfaces, and API group.

```
src/
  errors.ts    — Schema.TaggedErrorClass error classes + CouchDB wire-format decoders (shared across domains)
  server.ts    — Server-level endpoints: schemas + ServerApi group (info / uuids / auth / session)
  database.ts  — Database management endpoints: schemas + param interfaces + DatabaseApi group (CRUD / compact / replicate / changes / updates)
  document.ts  — Document endpoints: schemas + param interfaces + DocumentApi group (CRUD / bulk / mango / views / search / attachments / partitioned)
  api.ts       — Combined entry: CouchDbApi = HttpApi.make("couchdb").add(ServerApi, DatabaseApi, DocumentApi)
  client.ts    — NenoClient: wraps HttpApiClient.make(CouchDbApi)
  streams.ts   — Streaming helpers (NDJSON parsing, etc.)
  index.ts     — barrel re-exports
```

### Endpoint conventions

- Three `HttpApiGroup`s: `ServerApi` (server-level), `DatabaseApi` (database management), `DocumentApi` (document CRUD, bulk, views, search)
- Combined as `CouchDbApi = HttpApi.make("couchdb").add(ServerApi, DatabaseApi, DocumentApi)`
- Only include Wire schemas in an endpoint's `error` array for errors that endpoint actually returns
- Streaming endpoints use `HttpApiSchema.StreamUint8Array()`
- `delete` endpoints use bracket notation: `HttpApiEndpoint["delete"]`

### Error mapping

Each CouchDB error code maps to a pair: `NenoXxx` (TaggedErrorClass, for `catchTag`) + `NenoXxxWire` (Wire schema, for the HttpApiEndpoint `error` array).

Wire schemas bridge CouchDB wire format `{"error":"xxx","reason":"..."}` to TaggedErrorClass encoded form `{"_tag":"NenoXxx","reason":"..."}` via `Schema.decodeTo` + `SchemaGetter.transform`.

| Class | CouchDB `error` | HTTP status |
|---|---|---|
| `NenoIllegalDatabaseName` | `illegal_database_name` | 400 |
| `NenoBadRequest` | `bad_request` | 400 |
| `NenoUnauthorized` | `unauthorized` | 401 |
| `NenoForbidden` | `forbidden` | 403 |
| `NenoNotFound` | `not_found` | 404 |
| `NenoConflict` | `conflict` | 409 |
| `NenoAlreadyExists` | `file_exists` | 412 |
| `NenoBadContentType` | `bad_content_type` | 415 |
| `NenoInternalServerError` | `internal_server_error` | 500 |

When multiple errors share a status code (e.g. 400 has both `illegal_database_name` and `bad_request`), `HttpApiClient` disambiguates via `Schema.Union` + the `Schema.Literal` value on the `error` field.

### Client usage

```typescript
import { Effect } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { NenoClient } from "@better-doc/neno";

const program = Effect.gen(function* () {
  const client = yield* NenoClient;
  const info = yield* client.server.info();
  yield* client.database.create({ params: { name: "mydb" } });
  const doc = yield* client.document.get({ params: { db: "mydb", docid: "abc" } });
});

program.pipe(
  Effect.provide(NenoClient.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise,
);
```

### Adding an endpoint

1. Check https://docs.couchdb.org/en/stable/api/index.html for the endpoint path, method, params, success response, and all HTTP error status codes
2. If a new CouchDB error code is needed: add a `NenoXxx` class + `NenoXxxWire` wire schema in `errors.ts`
3. Add the response Schema, param interface, and `.add()` endpoint in the matching domain file (`server.ts` / `database.ts` / `document.ts`)
