import { DesignDocument, DesignDocumentSearchResponse, DesignDocumentViewResponse } from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import {
  CenoBadRequestWire,
  CenoConflictWire,
  CenoInternalServerErrorWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./errors";

// ---------------------------------------------------------------------------
// API — standalone HttpApi for the design-document scope
// ---------------------------------------------------------------------------

/** Self-contained HttpApi for CouchDB design-document endpoints (views, search, show/update/list, partitioned queries), independent of the other scopes. */
export const DesignDocumentApi = HttpApi.make("designDocument").add(
  HttpApiGroup.make("designDocument", { topLevel: true }).add(
    HttpApiEndpoint.get("view", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: Schema.Unknown,
      success: DesignDocumentViewResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("viewStream", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
    HttpApiEndpoint.get("search", "/:db/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: Schema.Unknown,
      success: DesignDocumentSearchResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoInternalServerErrorWire],
    }),
    HttpApiEndpoint.get("searchStream", "/:db/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
    HttpApiEndpoint.get("show", "/:db/_design/:ddoc/_show/:func/:docid", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        func: Schema.String,
        docid: Schema.String,
      }),
      query: Schema.Unknown,
      success: Schema.Unknown,
      error: [CenoNotFoundWire],
    }),
    HttpApiEndpoint.put("updateHandler", "/:db/_design/:ddoc/_update/:func/:docid", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        func: Schema.String,
        docid: Schema.String,
      }),
      payload: Schema.Unknown,
      success: Schema.Unknown,
      error: [CenoNotFoundWire, CenoConflictWire, CenoInternalServerErrorWire],
    }),
    HttpApiEndpoint.get("viewWithList", "/:db/_design/:ddoc/_list/:list/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        list: Schema.String,
        viewname: Schema.String,
      }),
      query: Schema.Unknown,
      success: Schema.Unknown,
      error: [CenoBadRequestWire, CenoNotFoundWire, CenoInternalServerErrorWire],
    }),
    HttpApiEndpoint.get("partitionedView", "/:db/_partition/:partition/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        partition: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: Schema.Unknown,
      success: DesignDocumentViewResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("partitionedSearch", "/:db/_partition/:partition/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        partition: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: Schema.Unknown,
      success: DesignDocumentSearchResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoInternalServerErrorWire],
    }),
  ),
);

// ---------------------------------------------------------------------------
// Service — CouchDB HTTP implementation of @ceno/core's DesignDocument
// ---------------------------------------------------------------------------

/** Derives a design-document-scope client from {@link DesignDocumentApi} and adapts it to the DesignDocument contract. */
const make = Effect.gen(function* () {
  const connect = yield* CouchDbClient;
  const client = yield* connect(DesignDocumentApi);
  return DesignDocument.of({
    view: (db, ddoc, viewname, opts) =>
      client.view({
        params: { db, ddoc, viewname },
        query: opts ?? {},
      }),
    viewStream: (db, ddoc, viewname, opts) =>
      client.viewStream({
        params: { db, ddoc, viewname },
        query: opts ?? {},
      }),
    search: (db, ddoc, index, opts) =>
      client.search({
        params: { db, ddoc, index },
        query: opts ?? {},
      }),
    searchStream: (db, ddoc, index, opts) =>
      client.searchStream({
        params: { db, ddoc, index },
        query: opts ?? {},
      }),
    show: (db, ddoc, func, docid) =>
      client.show({
        params: { db, ddoc, func, docid },
        query: {},
      }),
    updateHandler: (db, ddoc, func, docid, body) =>
      client.updateHandler({
        params: { db, ddoc, func, docid },
        payload: body,
      }),
    viewWithList: (db, ddoc, list, viewname, opts) =>
      client.viewWithList({
        params: { db, ddoc, list, viewname },
        query: opts ?? {},
      }),
    partitionedView: (db, partition, ddoc, viewname, opts) =>
      client.partitionedView({
        params: { db, partition, ddoc, viewname },
        query: opts ?? {},
      }),
    partitionedSearch: (db, partition, ddoc, index, opts) =>
      client.partitionedSearch({
        params: { db, partition, ddoc, index },
        query: opts ?? {},
      }),
  });
});

/** Provides the CouchDB-backed design-document service; requires a {@link CouchDbClient}. */
export const DesignDocumentLayer = Layer.effect(DesignDocument, make);
