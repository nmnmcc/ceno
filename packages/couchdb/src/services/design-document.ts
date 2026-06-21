import type {
  CenoBadRequest,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  DesignDocumentSearchParams,
  DesignDocumentViewParams,
  TransportError,
} from "@ceno/core";
import {
  DesignDocument,
  DesignDocumentInfoResponse,
  DesignDocumentSearchResponse,
  DesignDocumentViewResponse,
} from "@ceno/core";
import { Effect, Layer, Match, Schema, Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";
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

      const wantsStream = (o: unknown): o is { readonly stream: true } =>
        typeof o === "object" && o !== null && "stream" in o && o.stream === true;
      const needsBody = (o: unknown): o is object => typeof o === "object" && o !== null && "keys" in o;

      // `view` routes by its fourth argument: a `{ stream: true }` flag opens the
      // decoded-text stream, a body carrying `keys` needs the POST form, and
      // everything else is the plain GET view query.
      function view(
        db: string,
        ddoc: string,
        viewname: string,
        options?: DesignDocumentViewParams,
      ): Effect.Effect<
        DesignDocumentViewResponse,
        CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
      >;
      function view(
        db: string,
        ddoc: string,
        viewname: string,
        options: DesignDocumentViewParams & { readonly stream: true },
      ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
      function view(
        db: string,
        ddoc: string,
        viewname: string,
        body: unknown,
      ): Effect.Effect<
        DesignDocumentViewResponse,
        CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
      >;
      function view(db: string, ddoc: string, viewname: string, options?: unknown) {
        return Match.value(options).pipe(
          Match.when(wantsStream, ({ stream: _stream, ...query }) =>
            Effect.map(client.viewStream({ params: { db, ddoc, viewname }, query }), Stream.decodeText()),
          ),
          Match.when(needsBody, (body) => client.viewPost({ params: { db, ddoc, viewname }, payload: body })),
          Match.orElse((query) => client.view({ params: { db, ddoc, viewname }, query: query ?? {} })),
        );
      }

      // `search` opens the decoded-text stream when `{ stream: true }` is set,
      // otherwise performs the plain GET search query.
      function search(
        db: string,
        ddoc: string,
        index: string,
        options?: DesignDocumentSearchParams,
      ): Effect.Effect<
        DesignDocumentSearchResponse,
        CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
      >;
      function search(
        db: string,
        ddoc: string,
        index: string,
        options: DesignDocumentSearchParams & { readonly stream: true },
      ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
      function search(db: string, ddoc: string, index: string, options?: unknown) {
        return Match.value(options).pipe(
          Match.when(wantsStream, ({ stream: _stream, ...query }) =>
            Effect.map(client.searchStream({ params: { db, ddoc, index }, query }), Stream.decodeText()),
          ),
          Match.orElse((query) => client.search({ params: { db, ddoc, index }, query: query ?? {} })),
        );
      }

      return DesignDocument.of({
        info: (db, ddoc) => client.info({ params: { db, ddoc } }),
        view,
        search,
        render: {
          show: (db, ddoc, func, docid) => client.show({ params: { db, ddoc, func, docid }, query: {} }),
          update: (db, ddoc, func, docid, body) =>
            client.updateHandler({ params: { db, ddoc, func, docid }, payload: body }),
          list: (db, ddoc, list, viewname, opts) =>
            client.viewWithList({ params: { db, ddoc, list, viewname }, query: opts ?? {} }),
        },
        partition: {
          view: (db, partition, ddoc, viewname, opts) =>
            client.partitionedView({ params: { db, partition, ddoc, viewname }, query: opts ?? {} }),
          search: (db, partition, ddoc, index, opts) =>
            client.partitionedSearch({ params: { db, partition, ddoc, index }, query: opts ?? {} }),
        },
      });
    }),
  );
}
