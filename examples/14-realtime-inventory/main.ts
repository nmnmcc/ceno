/**
 * 14 — Real-Time Inventory
 *
 * A warehouse inventory system that tracks stock levels in real time.
 * Uses the continuous changes stream to react to stock updates, local
 * documents to persist processing checkpoints, and an optimistic
 * retry loop to handle concurrent stock adjustments.
 *
 *   yarn start
 */

import { Database, Document, LocalDocument, SchemaDocument, Version } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Fiber, Layer, Redacted, Schema, Stream } from "effect";
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

const ProductSchema = Version.version({
  name: Schema.String,
  sku: Schema.String,
  quantity: Schema.Number,
  warehouse: Schema.String,
  lastUpdated: Schema.String,
});

const program = Effect.gen(function* () {
  const database = yield* Database.Database;
  const document = yield* Document.Document;
  const local = yield* LocalDocument.LocalDocument;
  const db = "example-inventory";
  yield* database.create(db);

  const products = (yield* SchemaDocument.make(ProductSchema)).in(db);
  const rawDocs = document.in(db);

  // ─── Seed inventory ───

  yield* products.put("prod-laptop", {
    name: "ThinkPad X1",
    sku: "TP-X1-2025",
    quantity: 50,
    warehouse: "east",
    lastUpdated: "2025-06-01T10:00:00Z",
  });

  yield* products.put("prod-keyboard", {
    name: "Mechanical Keyboard",
    sku: "KB-MEC-01",
    quantity: 200,
    warehouse: "east",
    lastUpdated: "2025-06-01T10:00:00Z",
  });

  yield* products.put("prod-monitor", {
    name: '27" 4K Monitor',
    sku: "MON-4K-27",
    quantity: 30,
    warehouse: "west",
    lastUpdated: "2025-06-01T10:00:00Z",
  });

  // ─── Start continuous change listener (simulates a background worker) ───

  const stream = yield* database.changesStream(db, {
    feed: "continuous",
    since: "now",
    include_docs: true,
  });

  const alerts: string[] = [];
  const fiber = yield* stream.pipe(
    Stream.filter((change) => !change.id.startsWith("_")),
    Stream.take(3),
    Stream.runForEach((change) =>
      Effect.sync(() => {
        const doc = change as unknown as { doc?: { quantity?: number; name?: string } };
        const qty = doc.doc?.quantity ?? 0;
        const name = doc.doc?.name ?? change.id;
        if (qty <= 10) {
          alerts.push(`LOW STOCK: "${name}" has only ${qty} units left!`);
        } else {
          alerts.push(`Stock update: "${name}" now has ${qty} units`);
        }
      }),
    ),
    Effect.forkChild(),
  );

  yield* Effect.sleep("100 millis");

  // ─── Optimistic update with conflict retry ───
  // Simulates two workers trying to adjust the same product's stock

  const adjustStock = (docid: string, delta: number) =>
    Effect.retry(
      Effect.gen(function* () {
        const current = yield* products.get(docid);
        const newQty = current.quantity + delta;
        yield* products.put(
          docid,
          { ...current, quantity: newQty, lastUpdated: new Date().toISOString() },
          { rev: current._rev },
        );
        return newQty;
      }),
      { times: 3 },
    );

  // Worker A: sell 45 laptops (will trigger low stock)
  const qtyAfterSale = yield* adjustStock("prod-laptop", -45);
  console.log("After sale: laptop quantity =", qtyAfterSale);

  // Worker B: restock keyboards
  const qtyAfterRestock = yield* adjustStock("prod-keyboard", 50);
  console.log("After restock: keyboard quantity =", qtyAfterRestock);

  // Worker C: sell monitors down to critical level
  const qtyAfterMonitor = yield* adjustStock("prod-monitor", -25);
  console.log("After sale: monitor quantity =", qtyAfterMonitor);

  // Wait for the change listener to process all 3 events
  yield* Fiber.join(fiber);

  console.log("\nAlerts from change listener:");
  for (const alert of alerts) {
    console.log(` `, alert);
  }

  // ─── Checkpoint: save processing progress as a local document ───

  const changes = yield* database.changes(db);
  yield* local.insert(db, "inventory-checkpoint", {
    lastSeq: changes.last_seq,
    processedAt: new Date().toISOString(),
    alertCount: alerts.length,
  });

  const checkpoint = yield* local.get(db, "inventory-checkpoint");
  console.log("\nCheckpoint saved:", JSON.stringify(checkpoint));

  // ─── Check if a product exists before acting on it ───

  const laptopExists = yield* rawDocs.exists("prod-laptop");
  const phantomExists = yield* rawDocs.exists("prod-phantom");
  console.log("\nLaptop exists:", laptopExists);
  console.log("Phantom exists:", phantomExists);

  // ─── Low stock report via Mango query ───

  yield* rawDocs.createIndex({
    index: { fields: ["quantity"] },
    name: "by-quantity",
  });

  const lowStock = yield* products.find({
    selector: { quantity: { $lte: 10 } },
  });
  console.log("\nLow stock items:");
  for (const item of lowStock.docs) {
    console.log(`  ${item.name} (${item.sku}): ${item.quantity} units in ${item.warehouse}`);
  }

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
