/**
 * 07 — Changes Feed
 *
 * Listen to database changes: normal (poll) mode and continuous streaming.
 *
 *   yarn start
 */

import { Database, Document } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Fiber, Layer, Redacted, Stream } from "effect";
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
  const docs = (yield* Document.Document).in("example-changes");
  yield* database.create("example-changes");

  yield* docs.put("doc-1", { message: "hello" });
  yield* docs.put("doc-2", { message: "world" });

  // Normal changes feed — returns all changes at once
  const changes = yield* database.changes("example-changes");
  console.log("Changes:");
  for (const item of changes.results) {
    const rev = item.changes[0]?.rev ?? "unknown";
    console.log(`  ${item.id} (rev: ${rev})`);
  }
  console.log("Pending:", changes.pending);

  // Changes since a specific sequence
  yield* docs.put("doc-3", { message: "new" });
  const latest = yield* database.changes("example-changes", {
    since: String(changes.last_seq),
  });
  console.log(
    "New changes since last read:",
    latest.results.map((r) => r.id),
  );

  // Continuous changes stream — emits items as they arrive (feed: "continuous")
  const stream = yield* database.changesStream("example-changes", {
    feed: "continuous",
    since: "now",
  });
  const fiber = yield* stream.pipe(Stream.take(1), Stream.runCollect, Effect.forkChild());
  yield* Effect.sleep("100 millis");
  yield* docs.put("doc-4", { message: "streamed" });
  const collected = yield* Fiber.join(fiber);
  console.log(
    "Streamed:",
    [...collected].map((c) => c.id),
  );

  yield* database.destroy("example-changes");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
