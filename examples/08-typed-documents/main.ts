/**
 * 08 — Typed Documents
 *
 * SchemaDocument gives you type-safe document operations: the body is
 * validated on write, decoded on read, and typed end-to-end.
 *
 *   yarn start
 */

import { Database, SchemaDocument, version } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Layer, Redacted, Schema } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const CenoLayer = layer.pipe(
  Layer.provide(
    CouchDbClient.layer({
      url: process.env["COUCHDB_URL"] ?? "http://localhost:5984",
      username: process.env["COUCHDB_USER"] ?? "admin",
      password: Redacted.make(process.env["COUCHDB_PASSWORD"] ?? "admin"),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

// Define a versioned schema for Task documents
const TaskSchema = version({
  title: Schema.String,
  done: Schema.Boolean,
});

const program = Effect.gen(function* () {
  const database = yield* Database;
  yield* database.create("example-typed");

  // Create a typed document accessor scoped to a database
  const tasks = (yield* SchemaDocument.make(TaskSchema)).in("example-typed");

  // insert — body is typed as { title: string, done: boolean }
  const created = yield* tasks.insert({ title: "Write docs", done: false });
  console.log("Created:", created.id);

  // put with explicit ID
  yield* tasks.put("task-1", { title: "Ship feature", done: false });

  // get — returns { title: string, done: boolean, _id: string, _rev: string }
  const task = yield* tasks.get("task-1");
  console.log(`Task: "${task.title}" done=${task.done}`);

  // find with Mango — result docs are fully typed
  const result = yield* tasks.find({ selector: { done: false } });
  console.log("Incomplete tasks:");
  for (const doc of result.docs) {
    console.log(`  ${doc.title} (done=${doc.done})`);
  }

  // bulk insert
  yield* tasks.bulk([
    { title: "Task A", done: true },
    { title: "Task B", done: false },
  ]);

  const all = yield* tasks.find({ selector: {} });
  console.log("Total tasks:", all.docs.length);

  yield* database.destroy("example-typed");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
