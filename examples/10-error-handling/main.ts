/**
 * 10 — Error Handling
 *
 * Every ceno error is a tagged class. Use Effect's `catchTag` to handle
 * specific errors, or `match` to fold over success/failure.
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
  const docs = (yield* Document.Document).in("example-errors");
  yield* database.create("example-errors");

  // --- catchTag: handle a specific error type ---

  // Creating a database that already exists → CenoAlreadyExists
  const createResult = yield* database.create("example-errors").pipe(
    Effect.map(() => "created"),
    Effect.catchTag("CenoAlreadyExists", (err) => Effect.succeed(`already exists: ${err.reason}`)),
  );
  console.log("Create result:", createResult);

  // Getting a document that doesn't exist → CenoNotFound
  const getResult = yield* docs.get("nonexistent").pipe(
    Effect.map((doc) => `found: ${JSON.stringify(doc)}`),
    Effect.catchTag("CenoNotFound", () => Effect.succeed("not found (as expected)")),
  );
  console.log("Get result:", getResult);

  // --- Conflict detection: optimistic concurrency ---

  const created = yield* docs.put("contested", { value: 1 });

  // First update succeeds — uses the current rev
  yield* docs.put("contested", { value: 2 }, { rev: created.rev });

  // Second update with stale rev → CenoConflict
  const conflictResult = yield* docs.put("contested", { value: 3 }, { rev: created.rev }).pipe(
    Effect.map(() => "updated"),
    Effect.catchTag("CenoConflict", () => Effect.succeed("conflict — need to re-read and retry")),
  );
  console.log("Conflict result:", conflictResult);

  // --- match: fold over success/failure to handle any error ---

  const matchResult = yield* database.destroy("nonexistent-db").pipe(
    Effect.match({
      onFailure: (err) => `caught ${err._tag}`,
      onSuccess: () => "destroyed",
    }),
  );
  console.log("Match result:", matchResult);

  yield* database.destroy("example-errors");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
