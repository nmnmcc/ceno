/**
 * 06 — Design Documents
 *
 * Create a design document with a MapReduce view, then query it.
 *
 *   yarn start
 */

import { Database, DesignDocument, Document } from "@ceno/core";
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
  const ddoc = yield* DesignDocument;
  const db = "example-views";
  yield* database.create(db);

  // Create a design document with a map view
  yield* document.put(db, "_design/inventory", {
    views: {
      by_category: {
        map: "function(doc) { if (doc.category) emit(doc.category, doc.price); }",
      },
    },
  });

  // Seed data
  yield* document.bulk(db, [
    { category: "fruit", name: "Apple", price: 1.5 },
    { category: "fruit", name: "Banana", price: 0.75 },
    { category: "vegetable", name: "Carrot", price: 2.0 },
    { category: "vegetable", name: "Broccoli", price: 3.0 },
    { category: "fruit", name: "Cherry", price: 4.0 },
  ]);

  // Query the view — returns rows sorted by key (category)
  const result = yield* ddoc.view(db, "inventory", "by_category");
  console.log("All items by category:");
  for (const row of result.rows) {
    console.log(`  [${String(row.key)}] $${String(row.value)} (${row.id})`);
  }
  console.log("Total rows:", result.total_rows);

  // Query with view (POST body) — filter by specific keys
  const fruits = yield* ddoc.view(db, "inventory", "by_category", {
    keys: ["fruit"],
  });
  console.log("Fruits only:");
  for (const row of fruits.rows) {
    console.log(`  $${String(row.value)} (${row.id})`);
  }

  // Design document info
  const info = yield* ddoc.info(db, "inventory");
  console.log("View index signature:", info.view_index.signature);

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
