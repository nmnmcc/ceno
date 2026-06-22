/**
 * 09 — Schema Migration
 *
 * Version chains let you evolve document schemas over time. When reading,
 * old data is automatically migrated through the chain to the latest version.
 *
 *   yarn start
 */

import { Database, Document, SchemaDocument, Version } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Layer, Redacted, Schema } from "effect";
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

// V1: title only
const TaskV1 = Version.version({ title: Schema.String });

// V2: added priority (defaults to 0 for migrated v1 docs)
const TaskV2 = Version.version({
  from: TaskV1,
  to: { title: Schema.String, priority: Schema.Number },
  migrate: (v1) => ({ title: v1.title, priority: 0 }),
});

// V3: added tags (defaults to [] for migrated v2 docs)
const TaskV3 = Version.version({
  from: TaskV2,
  to: {
    title: Schema.String,
    priority: Schema.Number,
    tags: Schema.Array(Schema.String),
  },
  migrate: (v2) => ({ ...v2, tags: [] as readonly string[] }),
});

const program = Effect.gen(function* () {
  const database = yield* Database.Database;
  const document = yield* Document.Document;
  const db = "example-migration";
  yield* database.create(db);

  // Simulate legacy data written by older app versions
  yield* document.put(db, "old-v1", { title: "Legacy task" });
  yield* document.put(db, "old-v2", { title: "Medium task", priority: 5 });
  yield* document.put(db, "new-v3", {
    title: "Modern task",
    priority: 10,
    tags: ["important"],
  });

  // Read everything through the v3 lens — old data auto-migrates
  const tasks = (yield* SchemaDocument.make(TaskV3)).in(db);

  // V1 doc: migrates v1 → v2 → v3
  const v1Doc = yield* tasks.get("old-v1");
  console.log("V1 migrated:", {
    title: v1Doc.title,
    priority: v1Doc.priority, // 0 (default from v1→v2)
    tags: v1Doc.tags, // [] (default from v2→v3)
  });

  // V2 doc: migrates v2 → v3
  const v2Doc = yield* tasks.get("old-v2");
  console.log("V2 migrated:", {
    title: v2Doc.title,
    priority: v2Doc.priority, // 5 (preserved)
    tags: v2Doc.tags, // [] (default from v2→v3)
  });

  // V3 doc: no migration needed
  const v3Doc = yield* tasks.get("new-v3");
  console.log("V3 native:", {
    title: v3Doc.title,
    priority: v3Doc.priority, // 10
    tags: v3Doc.tags, // ["important"]
  });

  // find also migrates all results
  const all = yield* tasks.find({ selector: {} });
  console.log("\nAll tasks after migration:");
  for (const doc of all.docs) {
    console.log(`  "${doc.title}" priority=${doc.priority} tags=[${doc.tags.join(", ")}]`);
  }

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
