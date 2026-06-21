/**
 * 01 — Server Info
 *
 * Connect to CouchDB and query server metadata.
 *
 *   yarn start
 */

import { Server } from "@ceno/core";
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
  const server = yield* Server;

  const info = yield* server.info;
  console.log("CouchDB version:", info.version);
  console.log("UUID:", info.uuid);
  console.log("Features:", info.features.join(", "));

  const { uuids } = yield* server.uuids({ count: 3 });
  console.log("Generated UUIDs:", uuids);

  const session = yield* server.session;
  console.log("Current user:", session.userCtx.name);
  console.log("Roles:", session.userCtx.roles.join(", "));
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
