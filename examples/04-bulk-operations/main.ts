/**
 * 04 — Bulk Operations
 *
 * Working with multiple documents at once: bulk insert, fetch by keys,
 * bulkGet, and list.
 *
 *   yarn start
 */

import { Database, Document } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const CenoLayer = CouchDB.layer.pipe(
  Layer.provide(
    Client.layer({
      url: process.env["COUCHDB_URL"] ?? "http://localhost:5984",
      username: process.env["COUCHDB_USER"] ?? "admin",
      password: Redacted.make(process.env["COUCHDB_PASSWORD"] ?? "admin"),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

const program = Effect.gen(function* () {
  const database = yield* Database.Database;
  const docs = (yield* Document.Document).in("example-bulk");
  yield* database.create("example-bulk");

  // Bulk insert multiple documents
  const results = yield* docs.bulk([
    { _id: "user:alice", name: "Alice", role: "admin" },
    { _id: "user:bob", name: "Bob", role: "editor" },
    { _id: "user:charlie", name: "Charlie", role: "viewer" },
  ]);
  console.log(
    "Bulk insert:",
    results.map((r) => `${r.id} ok=${r.ok}`),
  );

  // Fetch specific documents by keys
  const fetched = yield* docs.fetch(["user:alice", "user:charlie"]);
  console.log(
    "Fetched rows:",
    fetched.rows.map((r) => ("id" in r ? r.id : r.key)),
  );

  // Bulk get with revision info
  const bulkResult = yield* docs.bulkGet([{ id: "user:alice" }, { id: "user:bob" }]);
  for (const item of bulkResult.results) {
    console.log(`bulkGet ${item.id}:`, item.docs.length, "revision(s)");
  }

  // List all documents
  const all = yield* docs.list();
  console.log("Total documents:", all.total_rows);

  yield* database.destroy("example-bulk");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
