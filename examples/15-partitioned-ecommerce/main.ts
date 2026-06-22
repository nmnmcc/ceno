/**
 * 15 — Partitioned E-Commerce Catalog
 *
 * A product catalog using CouchDB's partitioned database feature.
 * Products are partitioned by category — queries within a partition
 * are faster because CouchDB only scans that slice of the data.
 *
 * Document IDs follow the `partition:key` format required by CouchDB.
 *
 * NOTE: Requires CouchDB 3.x+ with partitioned database support.
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
  const db = "example-catalog";

  // Create a partitioned database
  yield* database.create(db, { partitioned: true });

  const info = yield* database.info(db);
  console.log("Created partitioned database:", info.db_name);
  console.log("  Partitioned:", info.props?.partitioned);

  const docs = document.in(db);

  // ─── Seed products (partition:key format) ───

  yield* docs.bulk([
    // electronics partition
    { _id: "electronics:laptop-pro", name: "Laptop Pro", price: 1299, inStock: true, rating: 4.5 },
    { _id: "electronics:wireless-mouse", name: "Wireless Mouse", price: 29, inStock: true, rating: 4.2 },
    { _id: "electronics:usb-hub", name: "USB-C Hub", price: 45, inStock: false, rating: 3.8 },
    { _id: "electronics:monitor-32", name: '32" Curved Monitor', price: 599, inStock: true, rating: 4.7 },
    { _id: "electronics:webcam-hd", name: "HD Webcam", price: 79, inStock: true, rating: 4.0 },

    // clothing partition
    { _id: "clothing:wool-sweater", name: "Merino Wool Sweater", price: 89, inStock: true, rating: 4.6 },
    { _id: "clothing:denim-jacket", name: "Classic Denim Jacket", price: 120, inStock: true, rating: 4.3 },
    { _id: "clothing:cotton-tshirt", name: "Organic Cotton T-Shirt", price: 25, inStock: true, rating: 4.1 },

    // books partition
    { _id: "books:effect-handbook", name: "The Effect Handbook", price: 45, inStock: true, rating: 4.9 },
    { _id: "books:couchdb-guide", name: "CouchDB: The Definitive Guide", price: 39, inStock: false, rating: 4.4 },
    { _id: "books:typescript-deep", name: "TypeScript Deep Dive", price: 35, inStock: true, rating: 4.7 },
  ]);
  console.log("\nSeeded 11 products across 3 partitions");

  // ─── Partition scoping with .partitioned() ───

  const electronics = docs.partitioned("electronics");
  const clothing = docs.partitioned("clothing");
  const books = docs.partitioned("books");

  // ─── Partition metadata ───

  const electronicsInfo = yield* electronics.info();
  console.log("\nElectronics partition:");
  console.log("  Documents:", electronicsInfo.doc_count);
  console.log("  Active size:", electronicsInfo.sizes.active, "bytes");

  const clothingInfo = yield* clothing.info();
  console.log("Clothing partition:", clothingInfo.doc_count, "docs");

  const booksInfo = yield* books.info();
  console.log("Books partition:", booksInfo.doc_count, "docs");

  // ─── List documents within a single partition ───

  const electronicsList = yield* electronics.list();
  console.log("\nElectronics products:");
  for (const row of electronicsList.rows) {
    console.log("  ", row.id);
  }

  // ─── Mango queries within a partition ───

  // Create a partitioned index for price queries
  yield* docs.createIndex({
    index: { fields: ["price"] },
    name: "by-price",
    partitioned: true,
  });

  // Find electronics under $100 (only scans the electronics partition)
  const cheapElectronics = yield* electronics.find({
    selector: { price: { $lt: 100 } },
    sort: [{ price: "asc" }],
  });
  console.log("\nElectronics under $100:");
  for (const doc of cheapElectronics.docs) {
    const product = doc as { name: string; price: number };
    console.log(`  ${product.name}: $${product.price}`);
  }

  // Find in-stock books
  const inStockBooks = yield* books.find({
    selector: { inStock: true },
  });
  console.log("\nIn-stock books:");
  for (const doc of inStockBooks.docs) {
    const book = doc as { name: string; price: number; rating: number };
    console.log(`  ${book.name} — $${book.price} (★${book.rating})`);
  }

  // ─── Partitioned MapReduce view ───

  yield* docs.put("_design/catalog", {
    options: { partitioned: true },
    views: {
      by_rating: {
        map: "function(doc) { if (doc.rating) emit(doc.rating, doc.name); }",
      },
    },
  });

  // Top-rated electronics via ddoc.in(db).partitioned() scoping
  const ddocs = ddoc.in(db);
  const electronicsDesign = ddocs.partitioned("electronics");
  const topRated = yield* electronicsDesign.view("catalog", "by_rating", {
    startkey: 4.5,
    inclusive_end: true,
  });
  console.log("\nTop-rated electronics (4.5+):");
  for (const row of topRated.rows) {
    console.log(`  ★${String(row.key)} — ${String(row.value)}`);
  }

  // All books sorted by rating
  const booksDesign = ddocs.partitioned("books");
  const booksByRating = yield* booksDesign.view("catalog", "by_rating", {
    descending: true,
  });
  console.log("\nBooks by rating:");
  for (const row of booksByRating.rows) {
    console.log(`  ★${String(row.key)} — ${String(row.value)}`);
  }

  // ─── Cross-partition query (global Mango — scans all partitions) ───

  yield* docs.createIndex({
    index: { fields: ["rating"] },
    name: "global-rating",
    partitioned: false,
  });

  const globalTopRated = yield* docs.find({
    selector: { rating: { $gte: 4.5 } },
  });
  console.log("\nGlobal top-rated (all categories):");
  for (const doc of globalTopRated.docs) {
    const product = doc as { _id: string; name: string; rating: number };
    const category = product._id.split(":")[0];
    console.log(`  [${category}] ${product.name} — ★${product.rating}`);
  }

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
