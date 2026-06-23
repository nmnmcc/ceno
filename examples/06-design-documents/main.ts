/**
 * 06 — Design Documents
 *
 * Create a design document with a MapReduce view, then query it.
 *
 *   yarn start
 */

import { Database, DesignDocument, Document } from "@ceno/core";
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
  const document = yield* Document.Document;
  const ddoc = yield* DesignDocument.DesignDocument;
  const db = "example-views";
  yield* database.create(db);

  // Write a design document with `ddoc.put`. The map is a real function: `doc` is
  // typed by the <Product> type argument, and the query-server `emit` is reached
  // through `this` (typed, no global to declare). put serializes the function —
  // stripping `this.` and minifying — automatically.
  interface Product {
    category: string;
    name: string;
    price: number;
  }
  yield* ddoc.put<Product>(db, "inventory", {
    views: {
      by_category: {
        map: function (doc) {
          this.emit(doc.category, doc.price);
        },
        reduce: DesignDocument.ReduceFunction.sum,
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

  // Reduce on (group=true): _sum gives the total price per category
  const totals = yield* ddoc.view(db, "inventory", "by_category", { group: true });
  console.log("Total price per category:");
  for (const row of totals.rows) {
    console.log(`  ${String(row.key)}: $${String(row.value)}`);
  }

  // Reduce off: the raw emitted rows, sorted by key (category)
  const items = yield* ddoc.view(db, "inventory", "by_category", { reduce: false });
  console.log("All items by category:");
  for (const row of items.rows) {
    console.log(`  [${String(row.key)}] $${String(row.value)} (${row.id})`);
  }

  // Design document info
  const info = yield* ddoc.info(db, "inventory");
  console.log("View index signature:", info.view_index.signature);

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
