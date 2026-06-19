/**
 * 03 — Document CRUD
 *
 * Core document operations: insert, put, get, update, and destroy.
 * Shows the `.in(db)` helper to avoid repeating the database name.
 *
 *   yarn start
 */

import { Database, Document } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Layer, Redacted } from "effect";
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

const program = Effect.gen(function* () {
  const database = yield* Database;
  const document = yield* Document;
  yield* database.create("example-docs");

  // Insert with server-generated ID
  const created = yield* document.insert("example-docs", {
    type: "task",
    title: "Learn ceno",
    done: false,
  });
  console.log("Created:", created.id, "rev:", created.rev);

  // Put with explicit ID
  const put = yield* document.put("example-docs", "task-2", {
    type: "task",
    title: "Build an app",
    done: false,
  });

  // Get a document
  const doc = yield* document.get("example-docs", "task-2");
  console.log("Fetched:", JSON.stringify(doc));

  // Update — pass the current rev to avoid conflicts
  const updated = yield* document.put(
    "example-docs",
    "task-2",
    { type: "task", title: "Build an app", done: true },
    { rev: put.rev },
  );
  console.log("Updated rev:", updated.rev);

  // Delete
  yield* document.destroy("example-docs", "task-2", updated.rev);
  console.log("Deleted task-2");

  // --- .in(db): scope all operations to a single database ---
  const docs = document.in("example-docs");

  yield* docs.put("task-3", { type: "task", title: "Use .in(db)", done: false });
  const scoped = yield* docs.get("task-3");
  console.log("Scoped get:", JSON.stringify(scoped));

  yield* database.destroy("example-docs");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
