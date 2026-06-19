# @ceno/core

Backend-agnostic service contracts, schemas, and errors for [ceno](https://github.com/nmnmcc/ceno) — a type-safe CouchDB client built on [Effect](https://effect.website).

This package defines the service interfaces that backend implementations (like [`@ceno/couchdb`](../couchdb)) must fulfill. It contains no implementation code — only contracts, schemas, error types, and utilities.

## Installation

```bash
npm install @ceno/core effect
```

## Table of contents

- [Architecture](#architecture)
- [Services](#services)
  - [Server](#server)
  - [Database](#database)
  - [Document](#document)
  - [DesignDocument](#designdocument)
  - [LocalDocument](#localdocument)
- [Schema documents](#schema-documents)
  - [SchemaDocument](#schemadocument)
  - [Database-scoped variant](#database-scoped-variant)
  - [SchemaLocalDocument](#schemalocaldocument)
- [Version migrations](#version-migrations)
- [Error handling](#error-handling)
- [Utilities](#utilities)
  - [parseNdjsonStream](#parsenjsonstream)
- [License](#license)

## Architecture

ceno separates **contracts** from **implementations**:

```
@ceno/core       — service interfaces, schemas, errors  (this package)
@ceno/couchdb    — CouchDB-over-HTTP implementation     (Layer providers)
```

Your application code imports service tags (`Server`, `Database`, `Document`, …) from `@ceno/core` and provides the implementation via a backend-specific layer. Switching backends requires changing only the layer — no application code changes.

```typescript
import { Database, Document, Server } from "@ceno/core";
// Provide the CouchDB implementation
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;
  // ...
});

program.pipe(Effect.provide(layer) /* ... */);
```

## Services

Each service is a `Context.Service` tag with an interface. Import the tag, yield it in an `Effect.gen` block, and call its methods.

### Server

Server metadata, UUIDs, and authentication.

| Method              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `info`              | Server metadata (`GET /`)                              |
| `uuids(options?)`   | Generate UUIDs (`GET /_uuids`)                         |
| `auth(credentials)` | Cookie-based session authentication (`POST /_session`) |
| `session`           | Current session info (`GET /_session`)                 |
| `logout`            | Close the session (`DELETE /_session`)                 |

### Database

Database management, changes feed, replication, and maintenance.

| Method                             | Description                                                       |
| ---------------------------------- | ----------------------------------------------------------------- |
| `create(name, options?)`           | Create a database (`PUT /{db}`)                                   |
| `get(name)`                        | Database metadata (`GET /{db}`)                                   |
| `head(name)`                       | Check existence (`HEAD /{db}`)                                    |
| `destroy(name)`                    | Delete a database (`DELETE /{db}`)                                |
| `list(options?)`                   | List all database names (`GET /_all_dbs`)                         |
| `dbsInfo(options?)`                | Metadata for multiple databases (`GET /_dbs_info`)                |
| `dbsInfoPost(keys)`                | Metadata for specific databases by name (`POST /_dbs_info`)       |
| `compact(name, ddoc?)`             | Trigger compaction (`POST /{db}/_compact`)                        |
| `viewCleanup(name)`                | Remove unused view indexes (`POST /{db}/_view_cleanup`)           |
| `ensureFullCommit(name)`           | Ensure data is flushed to disk (`POST /{db}/_ensure_full_commit`) |
| `getSecurity(name)`                | Get security object (`GET /{db}/_security`)                       |
| `setSecurity(name, security)`      | Set security object (`PUT /{db}/_security`)                       |
| `getRevsLimit(name)`               | Get revision limit (`GET /{db}/_revs_limit`)                      |
| `setRevsLimit(name, limit)`        | Set revision limit (`PUT /{db}/_revs_limit`)                      |
| `purge(name, body)`                | Permanently remove revisions (`POST /{db}/_purge`)                |
| `getPurgedInfosLimit(name)`        | Get purged infos limit (`GET /{db}/_purged_infos_limit`)          |
| `setPurgedInfosLimit(name, limit)` | Set purged infos limit (`PUT /{db}/_purged_infos_limit`)          |
| `missingRevs(name, body)`          | Find missing revisions (`POST /{db}/_missing_revs`)               |
| `revsDiff(name, body)`             | Find revision differences (`POST /{db}/_revs_diff`)               |
| `replicate(options)`               | Start a replication (`POST /_replicate`)                          |
| `changes(name, options?)`          | Changes feed (`GET /{db}/_changes`)                               |
| `changesPost(name, body)`          | Changes feed with body filters (`POST /{db}/_changes`)            |
| `changesStream(name, options?)`    | Continuous changes feed as a Stream                               |
| `updates(options?)`                | Global database update events (`GET /_db_updates`)                |

### Document

Document CRUD, bulk operations, Mango queries, attachments, and partitioned database operations.

| Method                                                 | Description                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `insert(db, body, options?)`                           | Insert with server-generated ID (`POST /{db}`)                     |
| `put(db, docid, body, options?)`                       | Create or update at a specific ID (`PUT /{db}/{docid}`)            |
| `get(db, docid, options?)`                             | Retrieve a document (`GET /{db}/{docid}`)                          |
| `head(db, docid)`                                      | Check document existence (`HEAD /{db}/{docid}`)                    |
| `destroy(db, docid, rev, options?)`                    | Delete a document (`DELETE /{db}/{docid}`)                         |
| `bulk(db, docs)`                                       | Bulk insert/update/delete (`POST /{db}/_bulk_docs`)                |
| `bulkGet(db, docs)`                                    | Bulk retrieve by ID (`POST /{db}/_bulk_get`)                       |
| `list(db, options?)`                                   | List all documents (`GET /{db}/_all_docs`)                         |
| `listStream(db, options?)`                             | List all documents as a Stream                                     |
| `fetch(db, keys, options?)`                            | Fetch specific documents by keys (`POST /{db}/_all_docs`)          |
| `find(db, query)`                                      | Mango query (`POST /{db}/_find`)                                   |
| `findStream(db, query)`                                | Mango query results as a Stream                                    |
| `createIndex(db, index)`                               | Create a Mango index (`POST /{db}/_index`)                         |
| `deleteIndex(db, ddoc, name)`                          | Delete a Mango index (`DELETE /{db}/_index/{ddoc}/json/{name}`)    |
| `listIndexes(db)`                                      | List all Mango indexes (`GET /{db}/_index`)                        |
| `explain(db, query)`                                   | Explain which index a query uses (`POST /{db}/_explain`)           |
| `attachmentInsert(db, docid, attname, data, options?)` | Upload attachment (`PUT /{db}/{docid}/{attname}`)                  |
| `attachmentGet(db, docid, attname, options?)`          | Download attachment as byte stream (`GET /{db}/{docid}/{attname}`) |
| `attachmentHead(db, docid, attname)`                   | Check attachment existence (`HEAD /{db}/{docid}/{attname}`)        |
| `attachmentDestroy(db, docid, attname, rev, options?)` | Delete attachment (`DELETE /{db}/{docid}/{attname}`)               |
| `partitionInfo(db, partition)`                         | Partition stats (`GET /{db}/_partition/{partition}`)               |
| `partitionedList(db, partition, options?)`             | List documents in a partition                                      |
| `partitionedFind(db, partition, query)`                | Mango query within a partition                                     |

### DesignDocument

View queries, full-text search, show/list/update functions, and partitioned variants.

| Method                                                     | Description                                            |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `info(db, ddoc)`                                           | View index metadata (`GET /{db}/_design/{ddoc}/_info`) |
| `view(db, ddoc, viewname, options?)`                       | Query a MapReduce view (`GET .../_view/{viewname}`)    |
| `viewPost(db, ddoc, viewname, body)`                       | Query a view via POST                                  |
| `viewStream(db, ddoc, viewname, options?)`                 | View results as a Stream                               |
| `search(db, ddoc, index, options?)`                        | Full-text search (`GET .../_search/{index}`)           |
| `searchStream(db, ddoc, index, options?)`                  | Search results as a Stream                             |
| `show(db, ddoc, func, docid)`                              | Show function (deprecated in CouchDB 3.0)              |
| `updateHandler(db, ddoc, func, docid, body)`               | Update handler (deprecated in CouchDB 3.0)             |
| `viewWithList(db, ddoc, list, viewname, options?)`         | List function (deprecated in CouchDB 3.0)              |
| `partitionedView(db, partition, ddoc, viewname, options?)` | View within a partition                                |
| `partitionedSearch(db, partition, ddoc, index, options?)`  | Search within a partition                              |

### LocalDocument

Local (non-replicated) document CRUD.

| Method                              | Description                                                       |
| ----------------------------------- | ----------------------------------------------------------------- |
| `get(db, docid)`                    | Retrieve a local document (`GET /{db}/_local/{docid}`)            |
| `insert(db, docid, body, options?)` | Create or update (`PUT /{db}/_local/{docid}`)                     |
| `destroy(db, docid, rev)`           | Delete (`DELETE /{db}/_local/{docid}`)                            |
| `list(db)`                          | List all local documents (`GET /{db}/_local_docs`)                |
| `fetch(db, body)`                   | Fetch specific local documents by keys (`POST /{db}/_local_docs`) |

## Schema documents

The low-level `Document` service accepts and returns `unknown`. For type-safe document access, ceno provides `SchemaDocument` and `SchemaLocalDocument`: schema-aware wrappers that **encode on writes** and **decode (with automatic migration) on reads**.

### SchemaDocument

Define your document shape as Effect Schema fields, then create a typed accessor with `SchemaDocument.make`:

```typescript
import { Document, SchemaDocument } from "@ceno/core";
import { Effect, Schema } from "effect";

const TodoFields = {
  title: Schema.String,
  done: Schema.Boolean,
};

const program = Effect.gen(function* () {
  const todos = yield* SchemaDocument.make(TodoFields);

  // Writes are type-checked
  yield* todos.put("mydb", "todo-1", { title: "Buy milk", done: false });

  // Reads are fully typed — `todo` is { title: string; done: boolean; _id: string; _rev: string }
  const todo = yield* todos.get("mydb", "todo-1");

  // find() returns typed docs too
  const result = yield* todos.find("mydb", {
    selector: { done: { $eq: false } },
  });

  // bulk() type-checks every document in the array
  yield* todos.bulk("mydb", [
    { title: "Walk dog", done: false },
    { title: "Read book", done: true },
  ]);
});
```

Available methods on `SchemaDocument`:

| Method                           | Description                              |
| -------------------------------- | ---------------------------------------- |
| `get(db, docid, options?)`       | Retrieve and decode a document           |
| `insert(db, body, options?)`     | Encode and insert a document             |
| `put(db, docid, body, options?)` | Encode and create/update a document      |
| `find(db, query)`                | Execute a Mango query with typed results |
| `bulk(db, docs)`                 | Bulk insert with type-checked documents  |

### Database-scoped variant

Pass a database name to `SchemaDocument.make` to get an accessor that doesn't require `db` on every call:

```typescript
const program = Effect.gen(function* () {
  const todos = yield* SchemaDocument.make(TodoFields, "mydb");

  yield* todos.put("todo-1", { title: "Buy milk", done: false });
  const todo = yield* todos.get("todo-1");
  const result = yield* todos.find({ selector: { done: { $eq: false } } });
});
```

### SchemaLocalDocument

`SchemaLocalDocument` works the same way for local (non-replicated) documents:

```typescript
import { SchemaLocalDocument } from "@ceno/core";

const program = Effect.gen(function* () {
  const configs = yield* SchemaLocalDocument.make({ checkpoint: Schema.String, lastSync: Schema.Number }, "mydb");

  yield* configs.insert("sync-state", { checkpoint: "abc", lastSync: 1719792000 });
  const state = yield* configs.get("sync-state");
  // state is { checkpoint: string; lastSync: number; _id: string; _rev: string }
});
```

Available methods on `SchemaLocalDocument`:

| Method                              | Description                               |
| ----------------------------------- | ----------------------------------------- |
| `get(db, docid)`                    | Retrieve and decode a local document      |
| `insert(db, docid, body, options?)` | Encode and create/update a local document |

## Version migrations

When your schema evolves, define a version chain. `SchemaDocument` automatically migrates old documents on read — no manual data migration needed:

```typescript
import { version } from "@ceno/core";

// V1: the original schema
const V1 = version({ title: Schema.String });

// V2: adds a `priority` field — old docs get priority 0
const V2 = version({
  from: V1,
  to: { title: Schema.String, priority: Schema.Number },
  migrate: (v1) => ({ title: v1.title, priority: 0 }),
});

// V3: adds a `tags` field — old docs get an empty array
const V3 = version({
  from: V2,
  to: { title: Schema.String, priority: Schema.Number, tags: Schema.Array(Schema.String) },
  migrate: (v2) => ({ ...v2, tags: [] as readonly string[] }),
});

const program = Effect.gen(function* () {
  const docs = yield* SchemaDocument.make(V3);

  // Reading a V1 document automatically migrates it through V1 → V2 → V3
  const doc = yield* docs.get("mydb", "old-doc");
  console.log(doc.priority); // 0 (from V2 migration)
  console.log(doc.tags); // [] (from V3 migration)
});
```

The migration tries the newest schema first. If decoding succeeds, the data is returned as-is. If it fails, it falls back through the chain, applying each `migrate` function in turn. If no version matches, a `MigrateError` is returned containing the accumulated decode errors from every version attempted.

### Version API

| Export                         | Description                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `version(fields \| migration)` | Create a version from plain fields or a migration `{ from, to, migrate }` |
| `migrate(data, version)`       | Decode data through a version chain, applying migrations as needed        |
| `toSchema(version)`            | Convert a version to an Effect `Schema`                                   |
| `isMigrateVersion(v)`          | Type guard for `MigrateVersion`                                           |
| `MigrateError`                 | Tagged error containing accumulated decode errors from all versions       |

## Error handling

All errors extend `TaggedErrorClass` with a `reason` field for type-safe `catchTag` matching:

| Error class               | CouchDB `error`         | HTTP status |
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

```typescript
import { CenoConflict, CenoNotFound, Document } from "@ceno/core";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const document = yield* Document;

  const doc = yield* document.get("alice", "rabbit").pipe(Effect.catchTag("CenoNotFound", () => Effect.succeed(null)));

  yield* document
    .put("alice", "rabbit", { happy: true })
    .pipe(Effect.catchTag("CenoConflict", () => Effect.logWarning("Document revision conflict")));
});
```

Type aliases:

- `CenoError` — Union of all nine error classes
- `TransportError` — `HttpClientError | Schema.SchemaError`

## Utilities

### parseNdjsonStream

Parses a newline-delimited JSON byte stream into a typed Effect `Stream`:

```typescript
import { parseNdjsonStream } from "@ceno/core";
import { Schema } from "effect";

const ChangeEvent = Schema.Struct({ seq: Schema.String, id: Schema.String });

const typedStream = parseNdjsonStream(ChangeEvent)(rawByteStream);
```

## License

[MIT](../../LICENSE)
