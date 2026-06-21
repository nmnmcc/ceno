# @ceno/schema

Schema-aware, version-migrating document operations for [ceno](https://github.com/nmnmcc/ceno) — a type-safe CouchDB client built on [Effect](https://effect.website).

The low-level `Document` and `LocalDocument` services from [`@ceno/core`](../core) accept and return `unknown`. This package layers typed access on top: `SchemaDocument` and `SchemaLocalDocument` are schema-aware wrappers that **encode on writes** and **decode (with automatic migration) on reads**. They are built from a version chain and resolve the underlying `@ceno/core` service from the Effect context — so you still provide a backend layer (like [`@ceno/couchdb`](../couchdb)) as usual.

## Installation

```bash
npm install @ceno/schema @ceno/core effect
```

## Table of contents

- [SchemaDocument](#schemadocument)
  - [Database-scoped variant](#database-scoped-variant)
- [SchemaLocalDocument](#schemalocaldocument)
- [Version migrations](#version-migrations)
  - [Version API](#version-api)
- [License](#license)

## SchemaDocument

Define your document shape as Effect Schema fields, then create a typed accessor with `SchemaDocument.make`. It resolves `Document` from the context, so provide a backend layer when running the program.

```typescript
import { Document } from "@ceno/core";
import { SchemaDocument } from "@ceno/schema";
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
| `in(db)`                         | Scope all methods to one database        |

### Database-scoped variant

Call `.in(db)` to get an accessor that doesn't require `db` on every call:

```typescript
const program = Effect.gen(function* () {
  const todos = (yield* SchemaDocument.make(TodoFields)).in("mydb");

  yield* todos.put("todo-1", { title: "Buy milk", done: false });
  const todo = yield* todos.get("todo-1");
  const result = yield* todos.find({ selector: { done: { $eq: false } } });
});
```

## SchemaLocalDocument

`SchemaLocalDocument` works the same way for local (non-replicated) documents, resolving `LocalDocument` from the context:

```typescript
import { LocalDocument } from "@ceno/core";
import { SchemaLocalDocument } from "@ceno/schema";
import { Effect, Schema } from "effect";

const ConfigFields = { checkpoint: Schema.String, lastSync: Schema.Number };

const program = Effect.gen(function* () {
  const configs = (yield* SchemaLocalDocument.make(ConfigFields)).in("mydb");

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
| `in(db)`                            | Scope all methods to one database         |

## Version migrations

When your schema evolves, define a version chain. `SchemaDocument` automatically migrates old documents on read — no manual data migration needed:

```typescript
import { SchemaDocument, version } from "@ceno/schema";
import { Effect, Schema } from "effect";

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

## License

Apache-2.0
