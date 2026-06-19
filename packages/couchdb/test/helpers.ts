import { Database } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

export const COUCHDB_URL = process.env["COUCHDB_URL"] ?? "http://localhost:5984";
export const COUCHDB_USER = process.env["COUCHDB_USER"] ?? "admin";
export const COUCHDB_PASSWORD = process.env["COUCHDB_PASSWORD"] ?? "admin";

/** Shared layer wiring every @ceno/core service to a real CouchDB instance. */
export const TestLayer = layer.pipe(
  Layer.provide(
    CouchDbClient.layer({
      url: COUCHDB_URL,
      username: COUCHDB_USER,
      password: Redacted.make(COUCHDB_PASSWORD),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

/** Generates a unique database name safe for concurrent test runs. */
export const uniqueDb = () => `ceno_test_${crypto.randomUUID().replaceAll("-", "")}`;

/** Creates a temporary database, runs `body`, then destroys the database regardless of outcome. */
export const withTempDb = <A, E, R>(body: (db: string) => Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const database = yield* Database;
    const name = uniqueDb();
    yield* database.create(name);
    return yield* body(name).pipe(Effect.ensuring(database.destroy(name).pipe(Effect.ignore)));
  });

/** Creates a temporary partitioned database, runs `body`, then destroys it. */
export const withTempPartitionedDb = <A, E, R>(body: (db: string) => Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const database = yield* Database;
    const name = uniqueDb();
    yield* database.create(name, { partitioned: true });
    return yield* body(name).pipe(Effect.ensuring(database.destroy(name).pipe(Effect.ignore)));
  });
