import { Context, Effect, Layer, type Redacted } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient, type HttpApi, type HttpApiGroup } from "effect/unstable/httpapi";

/** Factory service that derives a typed client for any HttpApi definition, with the configured CouchDB Basic-Auth credentials applied to every request. */
export class CouchDbClient extends Context.Service<
  CouchDbClient,
  <ApiId extends string, Groups extends HttpApiGroup.Any>(
    api: HttpApi.HttpApi<ApiId, Groups>,
  ) => Effect.Effect<HttpApiClient.Client<Groups>, never, HttpApiGroup.MiddlewareClient<Groups>>
>()("@ceno/couchdb/CouchDbClient") {}

/** Provides {@link CouchDbClient} configured with the CouchDB server URL and Basic-Auth credentials. */
export const layer = (config: {
  readonly url: string;
  readonly username: string | Redacted.Redacted<string>;
  readonly password: Redacted.Redacted<string>;
}) =>
  Layer.effect(
    CouchDbClient,
    Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;

      return CouchDbClient.of((api) =>
        HttpApiClient.make(api, {
          baseUrl: config.url,
          transformClient: HttpClient.mapRequest(HttpClientRequest.basicAuth(config.username, config.password)),
        }).pipe(Effect.provideService(HttpClient.HttpClient, httpClient)),
      );
    }),
  );
