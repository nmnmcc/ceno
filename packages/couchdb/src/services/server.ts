import {
  DatabaseAuthResponse,
  DatabaseSessionResponse,
  InfoResponse,
  OkResponse,
  Server,
  UUIDObject,
} from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import { CenoBadRequestWire, CenoForbiddenWire, CenoUnauthorizedWire } from "./errors";

/** CouchDB HTTP implementation of the server scope: metadata, UUIDs, session auth. */
export namespace CouchDbServer {
  /** Self-contained HttpApi for CouchDB server-level endpoints, independent of the other scopes. */
  export const Api = HttpApi.make("server").add(
    HttpApiGroup.make("server", { topLevel: true }).add(
      HttpApiEndpoint.get("info", "/", {
        success: InfoResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.get("uuids", "/_uuids", {
        query: Schema.Struct({ count: Schema.optional(Schema.NumberFromString) }),
        success: UUIDObject,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("auth", "/_session", {
        payload: Schema.Struct({ name: Schema.String, password: Schema.String }),
        success: DatabaseAuthResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.get("session", "/_session", {
        success: DatabaseSessionResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint["delete"]("logout", "/_session", {
        success: OkResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
    ),
  );

  /** Provides the CouchDB-backed server service; requires a {@link CouchDbClient}. */
  export const layer = Layer.effect(
    Server,
    Effect.gen(function* () {
      const connect = yield* CouchDbClient;
      const client = yield* connect(Api);
      return Server.of({
        info: client.info(),
        uuids: (opts) => client.uuids({ query: { count: opts?.count } }),
        auth: (creds) => client.auth({ payload: creds }),
        session: client.session(),
        logout: client.logout(),
      });
    }),
  );
}
