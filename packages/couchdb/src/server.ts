import { DatabaseAuthResponse, DatabaseSessionResponse, InfoResponse, Server, UUIDObject } from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import { CenoBadRequestWire, CenoForbiddenWire, CenoUnauthorizedWire } from "./errors";

// ---------------------------------------------------------------------------
// API — standalone HttpApi for the server scope
// ---------------------------------------------------------------------------

/** Self-contained HttpApi for CouchDB server-level endpoints (metadata, UUIDs, session auth), independent of the other scopes. */
export const ServerApi = HttpApi.make("server").add(
  HttpApiGroup.make("server", { topLevel: true }).add(
    HttpApiEndpoint.get("info", "/", { success: InfoResponse }),
    HttpApiEndpoint.get("uuids", "/_uuids", {
      query: Schema.Struct({ count: Schema.optional(Schema.NumberFromString) }),
      success: UUIDObject,
      error: [CenoBadRequestWire, CenoForbiddenWire],
    }),
    HttpApiEndpoint.post("auth", "/_session", {
      payload: Schema.Struct({ name: Schema.String, password: Schema.String }),
      success: DatabaseAuthResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire],
    }),
    HttpApiEndpoint.get("session", "/_session", {
      success: DatabaseSessionResponse,
      error: [CenoUnauthorizedWire],
    }),
  ),
);

// ---------------------------------------------------------------------------
// Service — CouchDB HTTP implementation of @ceno/core's Server
// ---------------------------------------------------------------------------

/** Derives a server-scope client from {@link ServerApi} and adapts it to the Server contract. */
const make = Effect.gen(function* () {
  const connect = yield* CouchDbClient;
  const client = yield* connect(ServerApi);
  return Server.of({
    info: client.info(),
    uuids: (opts) => client.uuids({ query: { count: opts?.count } }),
    auth: (creds) => client.auth({ payload: creds }),
    session: client.session(),
  });
});

/** Provides the CouchDB-backed server service; requires a {@link CouchDbClient}. */
export const ServerLayer = Layer.effect(Server, make);
