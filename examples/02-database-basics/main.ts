/**
 * 02 — Database Basics
 *
 * Database lifecycle: create, check existence, get info, list, and destroy.
 *
 *   yarn start
 */

import { Database } from "@ceno/core";
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

  yield* database.create("example-db");
  console.log("Database created");

  const exists = yield* database.exists("example-db");
  console.log("Database exists:", exists);

  const info = yield* database.info("example-db");
  console.log("DB name:", info.db_name);
  console.log("Doc count:", info.doc_count);
  console.log("Disk size:", info.sizes.file, "bytes");

  const dbs = yield* database.list();
  console.log(
    "All user databases:",
    dbs.filter((d) => !d.startsWith("_")),
  );

  yield* database.destroy("example-db");
  console.log("Database destroyed");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
