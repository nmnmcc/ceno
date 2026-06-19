import {
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListResponse,
  LocalDocument,
} from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import {
  CenoBadRequestWire,
  CenoConflictWire,
  CenoForbiddenWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./errors";

// ---------------------------------------------------------------------------
// API — standalone HttpApi for the local-document scope
// ---------------------------------------------------------------------------

/** Self-contained HttpApi for CouchDB local-document endpoints (non-replicated docs), independent of the other scopes. */
export const LocalDocumentApi = HttpApi.make("localDocument").add(
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
      success: DocumentInsertResponse,
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
      error: [CenoUnauthorizedWire],
    }),
    HttpApiEndpoint.post("fetch", "/:db/_local_docs", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      query: Schema.Unknown,
      success: DocumentFetchResponse,
      error: [CenoUnauthorizedWire],
    }),
  ),
);

// ---------------------------------------------------------------------------
// Service — CouchDB HTTP implementation of @ceno/core's LocalDocument
// ---------------------------------------------------------------------------

/** Derives a local-document-scope client from {@link LocalDocumentApi} and adapts it to the LocalDocument contract. */
const make = Effect.gen(function* () {
  const connect = yield* CouchDbClient;
  const client = yield* connect(LocalDocumentApi);
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
});

/** Provides the CouchDB-backed local-document service; requires a {@link CouchDbClient}. */
export const LocalDocumentLayer = Layer.effect(LocalDocument, make);
