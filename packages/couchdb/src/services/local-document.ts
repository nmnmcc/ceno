import {
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListResponse,
  LocalDocument,
} from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import {
  CenoBadRequestWire,
  CenoConflictWire,
  CenoForbiddenWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./errors";

/** CouchDB HTTP implementation of the local-document scope: non-replicated document CRUD. */
export namespace CouchDbLocalDocument {
  /** Self-contained HttpApi for CouchDB local-document endpoints, independent of the other scopes. */
  export const Api = HttpApi.make("localDocument").add(
    HttpApiGroup.make("localDocument", { topLevel: true }).add(
      HttpApiEndpoint.get("get", "/:db/_local/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        query: Schema.Unknown,
        success: Schema.Unknown,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.put("insert", "/:db/_local/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        payload: Schema.Unknown,
        query: Schema.Struct({ rev: Schema.optional(Schema.String) }),
        success: DocumentInsertResponse.pipe(HttpApiSchema.status(201)),
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
      }),
      HttpApiEndpoint["delete"]("destroy", "/:db/_local/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        query: Schema.Struct({ rev: Schema.String }),
        success: DocumentDestroyResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoConflictWire],
      }),
      HttpApiEndpoint.get("list", "/:db/_local_docs", {
        params: Schema.Struct({ db: Schema.String }),
        query: Schema.Unknown,
        success: DocumentListResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("fetch", "/:db/_local_docs", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        query: Schema.Unknown,
        success: DocumentFetchResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
    ),
  );

  /** Provides the CouchDB-backed local-document service; requires a {@link CouchDbClient}. */
  export const layer = Layer.effect(
    LocalDocument,
    Effect.gen(function* () {
      const connect = yield* CouchDbClient;
      const client = yield* connect(Api);
      return LocalDocument.of({
        get: (db, docid) => client.get({ params: { db, docid }, query: {} }),
        insert: (db, docid, body, opts) =>
          client.insert({
            params: { db, docid },
            payload: body,
            query: { rev: opts?.rev },
          }),
        destroy: (db, docid, rev) => client.destroy({ params: { db, docid }, query: { rev } }),
        list: (db) => client.list({ params: { db }, query: {} }),
        fetch: (db, body) => client.fetch({ params: { db }, payload: body, query: {} }),
      });
    }),
  );
}
