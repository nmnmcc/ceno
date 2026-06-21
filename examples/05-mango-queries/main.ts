/**
 * 05 — Mango Queries
 *
 * Querying documents with Mango: create indexes, find with selectors,
 * and list indexes.
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
  const docs = (yield* Document).in("example-mango");
  yield* database.create("example-mango");

  // Seed data
  yield* docs.bulk([
    { _id: "p1", type: "product", name: "Laptop", price: 999, category: "electronics" },
    { _id: "p2", type: "product", name: "Keyboard", price: 79, category: "electronics" },
    { _id: "p3", type: "product", name: "Notebook", price: 12, category: "stationery" },
    { _id: "p4", type: "product", name: "Pen", price: 3, category: "stationery" },
    { _id: "p5", type: "product", name: "Monitor", price: 450, category: "electronics" },
  ]);

  // Create an index on category + price
  const idx = yield* docs.createIndex({
    index: { fields: ["category", "price"] },
    name: "category-price-index",
  });
  console.log("Index created:", idx.name, `(${idx.result})`);

  // Find electronics under $500
  const result = yield* docs.find({
    selector: { category: "electronics", price: { $lt: 500 } },
    sort: [{ price: "asc" }],
  });
  console.log("Electronics under $500:");
  for (const doc of result.docs) {
    console.log(" ", JSON.stringify(doc));
  }

  // Find all stationery
  const stationery = yield* docs.find({ selector: { category: "stationery" } });
  console.log("Stationery:", stationery.docs.length, "items");

  // List indexes
  const indexes = yield* docs.listIndexes();
  console.log(
    "Indexes:",
    indexes.indexes.map((i) => i.name),
  );

  yield* database.destroy("example-mango");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
