import { Config, Context, Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { CouchDbApi } from "./api.js";

type CouchDbClient = HttpApiClient.ForApi<typeof CouchDbApi>;

/** Type-safe CouchDB HTTP client generated from CouchDbApi. */
export class NenoClient extends Context.Service<NenoClient, CouchDbClient>()("@better-doc/neno/client/NenoClient") {}

export namespace NenoClient {
  /** Build NenoClient from env vars. Requires `HttpClient.HttpClient` in context. */
  export const layer = Layer.effect(
    NenoClient,
    Effect.gen(function* () {
      const url = yield* Config.string("COUCHDB_URL");
      const username = yield* Config.string("COUCHDB_USERNAME");
      const password = yield* Config.string("COUCHDB_PASSWORD");

      return yield* HttpApiClient.make(CouchDbApi, {
        baseUrl: url,
        transformClient: (client) =>
          client.pipe(HttpClient.mapRequest(HttpClientRequest.basicAuth(username, password))),
      });
    }),
  );
}
