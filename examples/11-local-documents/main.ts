/**
 * 11 — Local Documents
 *
 * Local documents (`_local/`) are never replicated. They're useful for
 * per-node configuration or checkpoints. SchemaLocalDocument adds type
 * safety and auto-migration.
 *
 *   yarn start
 */

import { Database, LocalDocument, SchemaLocalDocument, Version } from "@ceno/core";
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

const program = Effect.gen(function* () {
  const database = yield* Database.Database;
  const local = yield* LocalDocument.LocalDocument;
  const db = "example-local";
  yield* database.create(db);

  // Insert a local document (not replicated)
  const created = yield* local.insert(db, "app-config", {
    theme: "dark",
    language: "en",
  });
  console.log("Local doc created, rev:", created.rev);

  // Get it back
  const config = yield* local.get(db, "app-config");
  console.log("Config:", JSON.stringify(config));

  // Update with revision
  yield* local.insert(db, "app-config", { theme: "light", language: "zh" }, { rev: created.rev });
  console.log("Config updated");

  // List local documents
  const all = yield* local.list(db);
  console.log(
    "Local docs:",
    all.rows.map((r) => r.id),
  );

  // --- SchemaLocalDocument: typed local documents with migration ---

  const ConfigV1 = Version.version({ theme: Schema.String });
  const ConfigV2 = Version.version({
    from: ConfigV1,
    to: { theme: Schema.String, fontSize: Schema.Number },
    migrate: (v1) => ({ theme: v1.theme, fontSize: 14 }),
  });

  const typedConfig = (yield* SchemaLocalDocument.make(ConfigV2)).in(db);

  // Insert a typed local document
  yield* typedConfig.insert("user-prefs", { theme: "dark", fontSize: 16 });

  // Get with full type safety
  const prefs = yield* typedConfig.get("user-prefs");
  console.log(`Prefs: theme=${prefs.theme}, fontSize=${prefs.fontSize}`);

  // Insert a v1-shaped document via raw LocalDocument
  yield* local.insert(db, "legacy-prefs", { theme: "system" });

  // SchemaLocalDocument auto-migrates it to v2 on read
  const migrated = yield* typedConfig.get("legacy-prefs");
  console.log(`Migrated: theme=${migrated.theme}, fontSize=${migrated.fontSize}`);

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
