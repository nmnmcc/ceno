# @ceno/couchdb

CouchDB HTTP implementation of [`@ceno/core`](../core) services — a type-safe CouchDB client built on [Effect](https://effect.website).

## Installation

```bash
npm install @ceno/core @ceno/couchdb effect
```

## Table of contents

- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Server functions](#server-functions)
  - [server.info](#serverinfo)
  - [server.uuids([options])](#serveruuidsoptions)
  - [server.auth(credentials)](#serverauthcredentials)
  - [server.session](#serversession)
  - [server.logout](#serverlogout)
- [Database functions](#database-functions)
  - [database.create(name, [options])](#databasecreatename-options)
  - [database.get(name)](#databasegetname)
  - [database.head(name)](#databaseheadname)
  - [database.destroy(name)](#databasedestroyname)
  - [database.list([options])](#databaselistoptions)
  - [database.dbsInfo([options])](#databasedbsinfooptions)
  - [database.compact(name, [ddoc])](#databasecompactname-ddoc)
  - [database.viewCleanup(name)](#databaseviewcleanupname)
  - [database.replicate(options)](#databasereplicateoptions)
  - [database.changes(name, [options])](#databasechangesname-options)
  - [database.changesStream(name, [options])](#databasechangesstreamname-options)
  - [database.updates([options])](#databaseupdatesoptions)
  - [database.getSecurity(name)](#databasegetsecurityname)
  - [database.setSecurity(name, security)](#databasesetsecurityname-security)
  - [database.getRevsLimit(name)](#databasegetrevslimitname)
  - [database.setRevsLimit(name, limit)](#databasesetrevslimitname-limit)
  - [database.purge(name, body)](#databasepurgename-body)
- [Document functions](#document-functions)
  - [document.insert(db, body, [options])](#documentinsertdb-body-options)
  - [document.put(db, docid, body, [options])](#documentputdb-docid-body-options)
  - [document.get(db, docid, [options])](#documentgetdb-docid-options)
  - [document.head(db, docid)](#documentheaddb-docid)
  - [document.destroy(db, docid, rev, [options])](#documentdestroydb-docid-rev-options)
  - [document.bulk(db, docs)](#documentbulkdb-docs)
  - [document.bulkGet(db, docs)](#documentbulkgetdb-docs)
  - [document.list(db, [options])](#documentlistdb-options)
  - [document.fetch(db, keys, [options])](#documentfetchdb-keys-options)
  - [document.find(db, query)](#documentfinddb-query)
  - [document.createIndex(db, index)](#documentcreateindexdb-index)
  - [document.deleteIndex(db, ddoc, name)](#documentdeleteindexdb-ddoc-name)
  - [document.listIndexes(db)](#documentlistindexesdb)
  - [document.explain(db, query)](#documentexplaindb-query)
- [Attachment functions](#attachment-functions)
  - [document.attachmentInsert(db, docid, attname, data, [options])](#documentattachmentinsertdb-docid-attname-data-options)
  - [document.attachmentGet(db, docid, attname, [options])](#documentattachmentgetdb-docid-attname-options)
  - [document.attachmentHead(db, docid, attname)](#documentattachmentheaddb-docid-attname)
  - [document.attachmentDestroy(db, docid, attname, rev, [options])](#documentattachmentdestroydb-docid-attname-rev-options)
- [Design document functions](#design-document-functions)
  - [designDocument.info(db, ddoc)](#designdocumentinfodb-ddoc)
  - [designDocument.view(db, ddoc, viewname, [options])](#designdocumentviewdb-ddoc-viewname-options)
  - [designDocument.viewPost(db, ddoc, viewname, body)](#designdocumentviewpostdb-ddoc-viewname-body)
  - [designDocument.viewStream(db, ddoc, viewname, [options])](#designdocumentviewstreamdb-ddoc-viewname-options)
  - [designDocument.search(db, ddoc, index, [options])](#designdocumentsearchdb-ddoc-index-options)
  - [designDocument.searchStream(db, ddoc, index, [options])](#designdocumentsearchstreamdb-ddoc-index-options)
  - [designDocument.show(db, ddoc, func, docid)](#designdocumentshowdb-ddoc-func-docid)
  - [designDocument.updateHandler(db, ddoc, func, docid, body)](#designdocumentupdatehandlerdb-ddoc-func-docid-body)
  - [designDocument.viewWithList(db, ddoc, list, viewname, [options])](#designdocumentviewwithlistdb-ddoc-list-viewname-options)
- [Partition functions](#partition-functions)
  - [document.partitionInfo(db, partition)](#documentpartitioninfodb-partition)
  - [document.partitionedList(db, partition, [options])](#documentpartitionedlistdb-partition-options)
  - [document.partitionedFind(db, partition, query)](#documentpartitionedfinddb-partition-query)
  - [designDocument.partitionedView(db, partition, ddoc, viewname, [options])](#designdocumentpartitionedviewdb-partition-ddoc-viewname-options)
  - [designDocument.partitionedSearch(db, partition, ddoc, index, [options])](#designdocumentpartitionedsearchdb-partition-ddoc-index-options)
- [Local document functions](#local-document-functions)
  - [localDocument.get(db, docid)](#localdocumentgetdb-docid)
  - [localDocument.insert(db, docid, body, [options])](#localdocumentinsertdb-docid-body-options)
  - [localDocument.destroy(db, docid, rev)](#localdocumentdestroydb-docid-rev)
  - [localDocument.list(db)](#localdocumentlistdb)
  - [localDocument.fetch(db, body)](#localdocumentfetchdb-body)
- [TypeScript](#typescript)
  - [Schema documents](#schema-documents)
  - [Version migrations](#version-migrations)
  - [Database-scoped variant](#database-scoped-variant)
  - [Schema local documents](#schema-local-documents)
- [Error handling](#error-handling)
- [Streaming](#streaming)
- [Tests](#tests)

## Getting started

Connect to your CouchDB server, create a database, and insert a document:

```typescript
import { Database, Document, Server } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;

  // check the server is alive
  const info = yield* server.info;
  console.log(`CouchDB ${info.version}`);

  // create a database
  yield* database.create("alice");

  // insert a document
  const response = yield* document.put("alice", "rabbit", { happy: true });
  console.log(response);
  // { ok: true, id: 'rabbit', rev: '1-...' }
});

program.pipe(
  Effect.provide(layer),
  Effect.provide(
    CouchDbClient.layer({
      url: "http://localhost:5984",
      username: "admin",
      password: Redacted.make("password"),
    }),
  ),
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise,
);
```

## Configuration

### CouchDbClient.layer

Create a client layer by supplying the CouchDB URL and Basic-Auth credentials:

```typescript
import { CouchDbClient } from "@ceno/couchdb";
import { Redacted } from "effect";

const clientLayer = CouchDbClient.layer({
  url: "http://localhost:5984",
  username: "admin",
  password: Redacted.make("password"),
});
```

Passwords are wrapped in `Redacted` so they are never accidentally logged or serialized.

### Providing the transport

ceno does not bundle any HTTP transport. Supply the one that fits your runtime:

```typescript
// Browser / Node.js 18+

// Node.js (undici)

import { NodeHttpClient } from "@effect/platform-node";
import { FetchHttpClient } from "effect/unstable/http";

Effect.provide(program, FetchHttpClient.layer);

Effect.provide(program, NodeHttpClient.layer);
```

### Providing individual services

The merged `layer` provides all five services. If you only need a subset, provide the individual layers:

```typescript
import { CouchDbServer } from "@ceno/couchdb";

program.pipe(Effect.provide(CouchDbServer.layer));
```

## Server functions

### server.info

Retrieves CouchDB server metadata (`GET /`):

```typescript
const info = yield * server.info;
// { couchdb: 'Welcome', version: '3.4.3', ... }
```

### server.uuids([options])

Generates one or more UUIDs (`GET /_uuids`):

```typescript
const { uuids } = yield * server.uuids({ count: 3 });
// ['6e1295ed6c29495e54cc05947f18c8af', ...]
```

### server.auth(credentials)

Authenticates via cookie-based session (`POST /_session`):

```typescript
const response = yield * server.auth({ name: "admin", password: "password" });
// { ok: true, name: 'admin', roles: ['_admin'] }
```

### server.session

Retrieves current session info (`GET /_session`):

```typescript
const session = yield * server.session;
// { ok: true, userCtx: { name: 'admin', roles: ['_admin'] }, info: { ... } }
```

### server.logout

Closes the current session (`DELETE /_session`):

```typescript
yield * server.logout;
```

## Database functions

### database.create(name, [options])

Creates a database (`PUT /{db}`):

```typescript
yield * database.create("alice");

// with options
yield * database.create("alice", { n: 3, partitioned: true });
```

### database.get(name)

Retrieves database metadata (`GET /{db}`):

```typescript
const info = yield * database.get("alice");
// { db_name: 'alice', doc_count: 42, ... }
```

### database.head(name)

Checks whether a database exists (`HEAD /{db}`). Fails with `CenoNotFound` if it does not:

```typescript
yield * database.head("alice");
```

### database.destroy(name)

Deletes a database (`DELETE /{db}`):

```typescript
yield * database.destroy("alice");
```

### database.list([options])

Lists all database names (`GET /_all_dbs`):

```typescript
const names = yield * database.list();
// ['alice', 'bob', ...]
```

### database.dbsInfo([options])

Retrieves metadata for multiple databases (`GET /_dbs_info`):

```typescript
const infos = yield * database.dbsInfo();
```

You can also retrieve metadata for specific databases by name:

```typescript
const infos = yield * database.dbsInfoPost(["alice", "bob"]);
```

### database.compact(name, [ddoc])

Triggers compaction (`POST /{db}/_compact`). If `ddoc` is supplied, compacts that design document's views:

```typescript
yield * database.compact("alice");
yield * database.compact("alice", "my-ddoc");
```

### database.viewCleanup(name)

Removes unused view index files (`POST /{db}/_view_cleanup`):

```typescript
yield * database.viewCleanup("alice");
```

### database.replicate(options)

Starts a replication (`POST /_replicate`):

```typescript
const result =
  yield *
  database.replicate({
    source: "alice",
    target: "http://otherhost:5984/alice",
    create_target: true,
  });
```

### database.changes(name, [options])

Retrieves the changes feed (`GET /{db}/_changes`):

```typescript
const changes = yield * database.changes("alice", { since: 0, include_docs: true });
changes.results.forEach((change) => {
  console.log(change.id, change.changes);
});
```

For POST-style filtering (supports `doc_ids`/`selector` in body):

```typescript
const changes =
  yield *
  database.changesPost("alice", {
    doc_ids: ["rabbit", "hatter"],
  });
```

### database.changesStream(name, [options])

Returns a stream of parsed change events from the continuous changes feed:

```typescript
const stream =
  yield *
  database.changesStream("alice", {
    feed: "continuous",
    include_docs: true,
  });
```

### database.updates([options])

Retrieves global database update events (`GET /_db_updates`):

```typescript
const updates = yield * database.updates();
```

### database.getSecurity(name)

Retrieves the database security object (`GET /{db}/_security`):

```typescript
const security = yield * database.getSecurity("alice");
```

### database.setSecurity(name, security)

Sets the database security object (`PUT /{db}/_security`):

```typescript
yield *
  database.setSecurity("alice", {
    admins: { names: ["admin"], roles: [] },
    members: { names: [], roles: ["reader"] },
  });
```

### database.getRevsLimit(name)

Retrieves the current revision limit (`GET /{db}/_revs_limit`):

```typescript
const limit = yield * database.getRevsLimit("alice");
```

### database.setRevsLimit(name, limit)

Sets the revision limit (`PUT /{db}/_revs_limit`):

```typescript
yield * database.setRevsLimit("alice", 500);
```

### database.purge(name, body)

Permanently removes references to specified document revisions (`POST /{db}/_purge`):

```typescript
yield *
  database.purge("alice", {
    "doc-id": ["1-abc", "2-def"],
  });
```

## Document functions

### document.insert(db, body, [options])

Inserts a document with a server-generated ID or the `_id` from the body (`POST /{db}`):

```typescript
const response = yield * document.insert("alice", { happy: true });
// { ok: true, id: '...', rev: '1-...' }

// with an _id in the body
const response = yield * document.insert("alice", { _id: "rabbit", happy: true });
```

### document.put(db, docid, body, [options])

Creates or updates a document at a specific ID (`PUT /{db}/{docid}`):

```typescript
const response = yield * document.put("alice", "rabbit", { happy: true });

// update an existing document (include _rev)
const response =
  yield *
  document.put("alice", "rabbit", {
    _rev: "1-23202479633c2b380f79507a776743d5",
    happy: false,
  });
```

### document.get(db, docid, [options])

Retrieves a document (`GET /{db}/{docid}`):

```typescript
const doc = yield * document.get("alice", "rabbit");
```

With optional query parameters:

```typescript
const doc = yield * document.get("alice", "rabbit", { revs_info: true });
```

### document.head(db, docid)

Checks whether a document exists (`HEAD /{db}/{docid}`). Fails with `CenoNotFound` if it does not:

```typescript
yield * document.head("alice", "rabbit");
```

### document.destroy(db, docid, rev, [options])

Deletes a document (`DELETE /{db}/{docid}`):

```typescript
const response = yield * document.destroy("alice", "rabbit", "3-66c01cdf99e84c83a9b3fe65b88db8c0");
```

### document.bulk(db, docs)

Bulk insert/update/delete (`POST /{db}/_bulk_docs`):

```typescript
const results =
  yield *
  document.bulk("alice", [
    { _id: "rabbit", happy: true },
    { _id: "hatter", mad: true },
  ]);
```

### document.bulkGet(db, docs)

Retrieves multiple documents by ID and optional revision in a single request (`POST /{db}/_bulk_get`):

```typescript
const results = yield * document.bulkGet("alice", [{ id: "rabbit" }, { id: "hatter", rev: "2-abc" }]);
```

### document.list(db, [options])

Lists all documents (`GET /{db}/_all_docs`):

```typescript
const result = yield * document.list("alice", { include_docs: true, limit: 10 });
result.rows.forEach((row) => {
  console.log(row.id, row.doc);
});
```

### document.fetch(db, keys, [options])

Fetches specific documents by keys (`POST /{db}/_all_docs`):

```typescript
const result = yield * document.fetch("alice", ["rabbit", "hatter", "dormouse"]);
```

### document.find(db, query)

Executes a [Mango query](https://docs.couchdb.org/en/stable/api/database/find.html) (`POST /{db}/_find`):

```typescript
const result =
  yield *
  document.find("alice", {
    selector: {
      name: { $eq: "Brian" },
      age: { $gt: 25 },
    },
    fields: ["name", "age"],
    limit: 50,
  });
```

### document.createIndex(db, index)

Creates a Mango index (`POST /{db}/_index`):

```typescript
const response =
  yield *
  document.createIndex("alice", {
    index: { fields: ["name"] },
    name: "name-index",
  });
```

### document.deleteIndex(db, ddoc, name)

Deletes a Mango index (`DELETE /{db}/_index/{ddoc}/json/{name}`):

```typescript
yield * document.deleteIndex("alice", "_design/name-index", "name-index");
```

### document.listIndexes(db)

Lists all Mango indexes (`GET /{db}/_index`):

```typescript
const result = yield * document.listIndexes("alice");
```

### document.explain(db, query)

Shows which index a Mango query would use without executing it (`POST /{db}/_explain`):

```typescript
const plan =
  yield *
  document.explain("alice", {
    selector: { name: { $eq: "Brian" } },
  });
```

## Attachment functions

### document.attachmentInsert(db, docid, attname, data, [options])

Uploads an attachment (`PUT /{db}/{docid}/{attname}`):

```typescript
const response = yield * document.attachmentInsert("alice", "rabbit", "picture.png", imageData, { rev: "1-abc" });
```

### document.attachmentGet(db, docid, attname, [options])

Downloads an attachment as a byte stream (`GET /{db}/{docid}/{attname}`):

```typescript
const stream = yield * document.attachmentGet("alice", "rabbit", "picture.png");
```

### document.attachmentHead(db, docid, attname)

Checks whether an attachment exists (`HEAD /{db}/{docid}/{attname}`):

```typescript
yield * document.attachmentHead("alice", "rabbit", "picture.png");
```

### document.attachmentDestroy(db, docid, attname, rev, [options])

Deletes an attachment (`DELETE /{db}/{docid}/{attname}`):

```typescript
yield * document.attachmentDestroy("alice", "rabbit", "picture.png", "2-def");
```

## Design document functions

Design documents are managed through the `Document` service (they are regular documents under `_design/`). The `DesignDocument` service provides operations specific to views, search, and other design document features.

### designDocument.info(db, ddoc)

Retrieves view index metadata for a design document (`GET /{db}/_design/{ddoc}/_info`):

```typescript
const info = yield * designDocument.info("alice", "my-ddoc");
```

### designDocument.view(db, ddoc, viewname, [options])

Queries a MapReduce view (`GET /{db}/_design/{ddoc}/_view/{viewname}`):

```typescript
const result =
  yield *
  designDocument.view("alice", "characters", "happy_ones", {
    key: "Tea Party",
    include_docs: true,
  });
result.rows.forEach((row) => {
  console.log(row.value);
});
```

Filter by multiple keys:

```typescript
const result =
  yield *
  designDocument.view("alice", "characters", "soldiers", {
    keys: ["Hearts", "Clubs"],
  });
```

### designDocument.viewPost(db, ddoc, viewname, body)

Queries a view via POST, supporting keys in the request body (`POST /{db}/_design/{ddoc}/_view/{viewname}`):

```typescript
const result =
  yield *
  designDocument.viewPost("alice", "characters", "soldiers", {
    keys: ["Hearts", "Clubs"],
  });
```

### designDocument.viewStream(db, ddoc, viewname, [options])

Returns a stream of view results as decoded text:

```typescript
const stream = yield * designDocument.viewStream("alice", "characters", "happy_ones");
```

### designDocument.search(db, ddoc, index, [options])

Queries a full-text search index (`GET /{db}/_design/{ddoc}/_search/{index}`). Requires the Clouseau plugin:

```typescript
const result =
  yield *
  designDocument.search("alice", "characters", "happy_ones", {
    q: "cat",
  });
```

### designDocument.searchStream(db, ddoc, index, [options])

Returns a stream of search results as decoded text:

```typescript
const stream =
  yield *
  designDocument.searchStream("alice", "characters", "happy_ones", {
    q: "cat",
  });
```

### designDocument.show(db, ddoc, func, docid)

Renders a document through a show function (`GET /{db}/_design/{ddoc}/_show/{func}/{docid}`). Deprecated in CouchDB 3.0:

```typescript
const result = yield * designDocument.show("alice", "characters", "format_doc", "rabbit");
```

### designDocument.updateHandler(db, ddoc, func, docid, body)

Applies an update handler to a document (`PUT /{db}/_design/{ddoc}/_update/{func}/{docid}`). Deprecated in CouchDB 3.0:

```typescript
const result =
  yield * designDocument.updateHandler("alice", "update", "inplace", "rabbit", { field: "happy", value: false });
```

### designDocument.viewWithList(db, ddoc, list, viewname, [options])

Applies a list function to a view (`GET /{db}/_design/{ddoc}/_list/{list}/{viewname}`). Deprecated in CouchDB 3.0:

```typescript
const result = yield * designDocument.viewWithList("alice", "characters", "my_list", "happy_ones");
```

## Partition functions

Functions related to [partitioned databases](https://docs.couchdb.org/en/stable/partitioned-dbs/index.html). Create a partitioned database with `{ partitioned: true }`:

```typescript
yield * database.create("my-partitioned-db", { partitioned: true });
```

Documents in partitioned databases must have a two-part `_id`: `<partition key>:<document id>`:

```typescript
yield *
  document.put("my-partitioned-db", "canidae:dog", {
    name: "Dog",
    latin: "Canis lupus familiaris",
  });
```

### document.partitionInfo(db, partition)

Retrieves partition stats (`GET /{db}/_partition/{partition}`):

```typescript
const stats = yield * document.partitionInfo("my-partitioned-db", "canidae");
```

### document.partitionedList(db, partition, [options])

Lists documents in a partition (`GET /{db}/_partition/{partition}/_all_docs`):

```typescript
const docs =
  yield *
  document.partitionedList("my-partitioned-db", "canidae", {
    include_docs: true,
    limit: 5,
  });
```

### document.partitionedFind(db, partition, query)

Executes a Mango query within a partition (`POST /{db}/_partition/{partition}/_find`):

```typescript
const result =
  yield *
  document.partitionedFind("my-partitioned-db", "canidae", {
    selector: { name: "Wolf" },
  });
```

### designDocument.partitionedView(db, partition, ddoc, viewname, [options])

Queries a view within a partition (`GET /{db}/_partition/{partition}/_design/{ddoc}/_view/{viewname}`):

```typescript
const result =
  yield * designDocument.partitionedView("my-partitioned-db", "canidae", "view-ddoc", "by-name", { limit: 10 });
```

### designDocument.partitionedSearch(db, partition, ddoc, index, [options])

Queries a search index within a partition. Requires the Clouseau plugin:

```typescript
const result =
  yield *
  designDocument.partitionedSearch("my-partitioned-db", "canidae", "search-ddoc", "search-index", { q: "name:'Wolf'" });
```

## Local document functions

Local documents are not replicated and are managed through the `LocalDocument` service.

### localDocument.get(db, docid)

Retrieves a local document (`GET /{db}/_local/{docid}`):

```typescript
const doc = yield * localDocument.get("alice", "my-local-doc");
```

### localDocument.insert(db, docid, body, [options])

Creates or updates a local document (`PUT /{db}/_local/{docid}`):

```typescript
const response =
  yield *
  localDocument.insert("alice", "my-local-doc", {
    checkpoint: "abc123",
  });
```

### localDocument.destroy(db, docid, rev)

Deletes a local document (`DELETE /{db}/_local/{docid}`):

```typescript
yield * localDocument.destroy("alice", "my-local-doc", "0-1");
```

### localDocument.list(db)

Lists all local documents (`GET /{db}/_local_docs`):

```typescript
const result = yield * localDocument.list("alice");
```

### localDocument.fetch(db, body)

Fetches specific local documents by keys (`POST /{db}/_local_docs`):

```typescript
const result =
  yield *
  localDocument.fetch("alice", {
    keys: ["my-local-doc", "another-local-doc"],
  });
```

## TypeScript

The low-level `Document` service accepts and returns `unknown` — you can use it freely without defining schemas. For type-safe document access, ceno provides `SchemaDocument` and `SchemaLocalDocument`: schema-aware wrappers that **encode on writes** and **decode (with automatic migration) on reads**.

### Schema documents

Define your document shape as Effect Schema fields, then create a typed document accessor with `SchemaDocument.make`:

```typescript
import { Document, SchemaDocument } from "@ceno/core";
import { Effect, Schema } from "effect";

const TodoFields = {
  title: Schema.String,
  done: Schema.Boolean,
};

const program = Effect.gen(function* () {
  const todos = yield* SchemaDocument.make(TodoFields);

  // Writes are type-checked — missing or wrong fields are compile errors
  yield* todos.put("mydb", "todo-1", { title: "Buy milk", done: false });

  // Reads are fully typed — `todo` is { title: string; done: boolean; _id: string; _rev: string }
  const todo = yield* todos.get("mydb", "todo-1");
  console.log(todo.title); // "Buy milk"
  console.log(todo._rev); // "1-..."

  // find() returns typed docs too
  const result = yield* todos.find("mydb", {
    selector: { done: { $eq: false } },
  });
  result.docs.forEach((doc) => {
    console.log(doc.title, doc.done);
  });

  // bulk() type-checks every document in the array
  yield* todos.bulk("mydb", [
    { title: "Walk dog", done: false },
    { title: "Read book", done: true },
  ]);
});
```

### Version migrations

When your schema evolves, define a version chain. `SchemaDocument` automatically migrates old documents on read — no manual data migration needed:

```typescript
// V1: the original schema
const V1 = { title: Schema.String };

// V2: adds a `priority` field — old docs get priority 0
const V2 = {
  from: V1,
  to: { title: Schema.String, priority: Schema.Number },
  migrate: (v1: { readonly title: string }) => ({ title: v1.title, priority: 0 }),
};

// V3: adds a `tags` field — old docs get an empty array
const V3 = {
  from: V2,
  to: { title: Schema.String, priority: Schema.Number, tags: Schema.Array(Schema.String) },
  migrate: (v2: { readonly title: string; readonly priority: number }) => ({
    ...v2,
    tags: [] as readonly string[],
  }),
};

const program = Effect.gen(function* () {
  const docs = yield* SchemaDocument.make(V3);

  // Reading a V1 document automatically migrates it through V1 → V2 → V3
  const doc = yield* docs.get("mydb", "old-doc");
  // doc is { title: string; priority: number; tags: readonly string[]; _id: string; _rev: string }
  console.log(doc.priority); // 0 (from V2 migration)
  console.log(doc.tags); // [] (from V3 migration)
});
```

The migration tries the newest schema first. If decoding succeeds, the data is returned as-is. If it fails, it falls back through the chain, applying each `migrate` function in turn. If no version matches, a `MigrateError` is returned containing the accumulated decode errors from every version attempted.

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

### Schema local documents

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

## Error handling

CouchDB errors are mapped to tagged error classes. Use `catchTag` for precise error handling:

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

## Streaming

Several methods return Effect `Stream` values for processing large result sets without loading everything into memory:

- `database.changesStream` — continuous changes feed
- `document.listStream` — all documents
- `document.findStream` — Mango query results
- `document.attachmentGet` — attachment bytes
- `designDocument.viewStream` — view results
- `designDocument.searchStream` — search results

```typescript
import { Stream } from "effect";

const stream =
  yield *
  database.changesStream("alice", {
    feed: "continuous",
    include_docs: true,
  });

yield *
  stream.pipe(
    Stream.tap((change) => Effect.log(`Changed: ${change.id}`)),
    Stream.runDrain,
  );
```

## Tests

```bash
cd ceno
yarn install
yarn test
```

## License

[MIT](../../LICENSE)
