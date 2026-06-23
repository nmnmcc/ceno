import {
  DesignDocument,
  DesignDocumentInfoResponse,
  DesignDocumentSearchParams,
  DesignDocumentSearchResponse,
  DesignDocumentViewParams,
  DesignDocumentViewResponse,
} from "@ceno/core/DesignDocument";
import { DocumentInsertResponse } from "@ceno/core/Document";
import { Effect, Layer, Schema, Stream } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./Client.ts";
import {
  CenoBadRequestWire,
  CenoConflictWire,
  CenoForbiddenWire,
  CenoInternalServerErrorWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./Errors.ts";
import { encodeDesignBody } from "./internal/designBody.ts";

/** Self-contained HttpApi for CouchDB design-document endpoints, independent of the other scopes. */
export const Api = HttpApi.make("designDocument").add(
  HttpApiGroup.make("designDocument", { topLevel: true }).add(
    HttpApiEndpoint.put("put", "/:db/_design/:ddoc", {
      params: Schema.Struct({ db: Schema.String, ddoc: Schema.String }),
      payload: Schema.Unknown,
      success: [
        DocumentInsertResponse.pipe(HttpApiSchema.status(201)),
        DocumentInsertResponse.pipe(HttpApiSchema.status(202)),
      ],
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
    }),
    HttpApiEndpoint.get("info", "/:db/_design/:ddoc/_info", {
      params: Schema.Struct({ db: Schema.String, ddoc: Schema.String }),
      success: DesignDocumentInfoResponse,
      error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("view", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: DesignDocumentViewParams,
      success: DesignDocumentViewResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.post("viewPost", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      payload: Schema.Unknown,
      success: DesignDocumentViewResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("viewStream", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: DesignDocumentViewParams,
      success: HttpApiSchema.StreamUint8Array(),
    }),
    HttpApiEndpoint.get("search", "/:db/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: DesignDocumentSearchParams,
      success: DesignDocumentSearchResponse,
      error: [
        CenoBadRequestWire,
        CenoUnauthorizedWire,
        CenoForbiddenWire,
        CenoNotFoundWire,
        CenoInternalServerErrorWire,
      ],
    }),
    HttpApiEndpoint.get("searchStream", "/:db/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: DesignDocumentSearchParams,
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
      error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoInternalServerErrorWire],
    }),
    HttpApiEndpoint.put("updateHandler", "/:db/_design/:ddoc/_update/:func/:docid", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        func: Schema.String,
        docid: Schema.String,
      }),
      payload: Schema.Unknown,
      success: [Schema.Unknown, Schema.Unknown.pipe(HttpApiSchema.status(201))],
      error: [
        CenoBadRequestWire,
        CenoUnauthorizedWire,
        CenoForbiddenWire,
        CenoNotFoundWire,
        CenoInternalServerErrorWire,
      ],
    }),
    HttpApiEndpoint.get("viewWithList", "/:db/_design/:ddoc/_list/:list/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        list: Schema.String,
        viewname: Schema.String,
      }),
      query: DesignDocumentViewParams,
      success: Schema.Unknown,
      error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoInternalServerErrorWire],
    }),
    HttpApiEndpoint.get("partitionedView", "/:db/_partition/:partition/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        partition: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: DesignDocumentViewParams,
      success: DesignDocumentViewResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("partitionedSearch", "/:db/_partition/:partition/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        partition: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: DesignDocumentSearchParams,
      success: DesignDocumentSearchResponse,
      error: [
        CenoBadRequestWire,
        CenoUnauthorizedWire,
        CenoForbiddenWire,
        CenoNotFoundWire,
        CenoInternalServerErrorWire,
      ],
    }),
  ),
);

/** Provides the CouchDB-backed design-document service; requires a {@link CouchDbClient}. */
export const layer = Layer.effect(
  DesignDocument,
  Effect.gen(function* () {
    const connect = yield* CouchDbClient;
    const client = yield* connect(Api);

    const makeDatabasePartitioned = (
      db: string,
      partition: string,
    ): DesignDocument.DatabasePartitionedDesignDocument => ({
      view: (ddoc, viewname, opts) =>
        client.partitionedView({ params: { db, partition, ddoc, viewname }, query: opts ?? {} }),
      search: (ddoc, index, opts) =>
        client.partitionedSearch({ params: { db, partition, ddoc, index }, query: opts ?? {} }),
    });

    const makeScoped = (db: string): DesignDocument.DatabaseDesignDocument => ({
      put: (ddoc, body) => designDocument.put(db, ddoc, body),
      info: (ddoc) => designDocument.info(db, ddoc),
      view: (ddoc, viewname, opts) => designDocument.view(db, ddoc, viewname, opts),
      viewPost: (ddoc, viewname, body) => designDocument.viewPost(db, ddoc, viewname, body),
      viewStream: (ddoc, viewname, opts) => designDocument.viewStream(db, ddoc, viewname, opts),
      search: (ddoc, index, opts) => designDocument.search(db, ddoc, index, opts),
      searchStream: (ddoc, index, opts) => designDocument.searchStream(db, ddoc, index, opts),
      show: (ddoc, func, docid) => designDocument.show(db, ddoc, func, docid),
      updateHandler: (ddoc, func, docid, body) => designDocument.updateHandler(db, ddoc, func, docid, body),
      viewWithList: (ddoc, list, viewname, opts) => designDocument.viewWithList(db, ddoc, list, viewname, opts),
      partitionedView: (partition, ddoc, viewname, opts) =>
        designDocument.partitionedView(db, partition, ddoc, viewname, opts),
      partitionedSearch: (partition, ddoc, index, opts) =>
        designDocument.partitionedSearch(db, partition, ddoc, index, opts),
      partitioned: (partition) => makeDatabasePartitioned(db, partition),
    });

    const designDocument: DesignDocument.DesignDocument = {
      put: (db, ddoc, body) =>
        Effect.flatMap(encodeDesignBody(body), (payload) => client.put({ params: { db, ddoc }, payload })),
      info: (db, ddoc) => client.info({ params: { db, ddoc } }),
      view: (db, ddoc, viewname, opts) => client.view({ params: { db, ddoc, viewname }, query: opts ?? {} }),
      viewPost: (db, ddoc, viewname, body) => client.viewPost({ params: { db, ddoc, viewname }, payload: body }),
      viewStream: (db, ddoc, viewname, opts) =>
        Effect.map(client.viewStream({ params: { db, ddoc, viewname }, query: opts ?? {} }), Stream.decodeText()),
      search: (db, ddoc, index, opts) => client.search({ params: { db, ddoc, index }, query: opts ?? {} }),
      searchStream: (db, ddoc, index, opts) =>
        Effect.map(client.searchStream({ params: { db, ddoc, index }, query: opts ?? {} }), Stream.decodeText()),
      show: (db, ddoc, func, docid) => client.show({ params: { db, ddoc, func, docid }, query: {} }),
      updateHandler: (db, ddoc, func, docid, body) =>
        client.updateHandler({ params: { db, ddoc, func, docid }, payload: body }),
      viewWithList: (db, ddoc, list, viewname, opts) =>
        client.viewWithList({ params: { db, ddoc, list, viewname }, query: opts ?? {} }),
      partitionedView: (db, partition, ddoc, viewname, opts) =>
        client.partitionedView({ params: { db, partition, ddoc, viewname }, query: opts ?? {} }),
      partitionedSearch: (db, partition, ddoc, index, opts) =>
        client.partitionedSearch({ params: { db, partition, ddoc, index }, query: opts ?? {} }),
      partitioned: (partition) => ({
        view: (db, ddoc, viewname, opts) =>
          client.partitionedView({ params: { db, partition, ddoc, viewname }, query: opts ?? {} }),
        search: (db, ddoc, index, opts) =>
          client.partitionedSearch({ params: { db, partition, ddoc, index }, query: opts ?? {} }),
      }),
      in: makeScoped,
    };
    return DesignDocument.of(designDocument);
  }),
);
