import {
  DesignDocument,
  DesignDocumentInfoResponse,
  DesignDocumentSearchResponse,
  DesignDocumentViewResponse,
} from "@ceno/core";
import { Effect, Layer, Schema, Stream } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import {
  CenoBadRequestWire,
  CenoForbiddenWire,
  CenoInternalServerErrorWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./errors";

/** CouchDB HTTP implementation of the design-document scope: views, search, show/update/list, partitioned queries. */
export namespace CouchDbDesignDocument {
  /** Self-contained HttpApi for CouchDB design-document endpoints, independent of the other scopes. */
  export const Api = HttpApi.make("designDocument").add(
    HttpApiGroup.make("designDocument", { topLevel: true }).add(
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
        query: Schema.Unknown,
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
        query: Schema.Unknown,
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
        query: Schema.Unknown,
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
        query: Schema.Unknown,
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

      return DesignDocument.of({
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
      });
    }),
  );
}
