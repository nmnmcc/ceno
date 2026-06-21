import type {
  CenoBadRequest,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  DocumentListParams,
  MangoQuery,
  TransportError,
} from "@ceno/core";
import {
  BulkGetResponse,
  CreateIndexResponse,
  Document,
  DocumentBulkResponse,
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListResponse,
  IndexListResponse,
  MangoResponse,
  OkResponse,
  PartitionInfoResponse,
} from "@ceno/core";
import { Effect, Layer, Match, Schema, Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import {
  CenoBadContentTypeWire,
  CenoBadRequestWire,
  CenoConflictWire,
  CenoForbiddenWire,
  CenoInternalServerErrorWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./errors";

/** CouchDB HTTP implementation of the document scope: CRUD, bulk ops, Mango queries, attachments, streaming, partitioned queries. */
export namespace CouchDbDocument {
  /** Self-contained HttpApi for CouchDB document endpoints, independent of the other scopes. */
  export const Api = HttpApi.make("document").add(
    HttpApiGroup.make("document", { topLevel: true }).add(
      // ─── CRUD ───
      HttpApiEndpoint.post("insert", "/:db", {
        params: Schema.Struct({ db: Schema.String }),
        query: Schema.Struct({ batch: Schema.optional(Schema.String) }),
        payload: Schema.Unknown,
        success: [
          DocumentInsertResponse.pipe(HttpApiSchema.status(201)),
          DocumentInsertResponse.pipe(HttpApiSchema.status(202)),
        ],
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
      }),
      HttpApiEndpoint.put("insertWithId", "/:db/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        payload: Schema.Unknown,
        query: Schema.Struct({
          rev: Schema.optional(Schema.String),
          batch: Schema.optional(Schema.String),
          new_edits: Schema.optional(Schema.Boolean),
        }),
        success: [
          DocumentInsertResponse.pipe(HttpApiSchema.status(201)),
          DocumentInsertResponse.pipe(HttpApiSchema.status(202)),
        ],
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
      }),
      HttpApiEndpoint.get("get", "/:db/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        query: Schema.Unknown,
        success: Schema.Unknown,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.head("head", "/:db/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        success: Schema.Void,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint["delete"]("destroy", "/:db/:docid", {
        params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
        query: Schema.Struct({ rev: Schema.String, batch: Schema.optional(Schema.String) }),
        success: [DocumentDestroyResponse, DocumentDestroyResponse.pipe(HttpApiSchema.status(202))],
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
      }),
      // ─── Bulk ───
      HttpApiEndpoint.post("bulk", "/:db/_bulk_docs", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        success: Schema.Array(DocumentBulkResponse).pipe(HttpApiSchema.status(201)),
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.post("bulkGet", "/:db/_bulk_get", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        success: BulkGetResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoBadContentTypeWire],
      }),
      // ─── All docs ───
      HttpApiEndpoint.get("list", "/:db/_all_docs", {
        params: Schema.Struct({ db: Schema.String }),
        query: Schema.Unknown,
        success: DocumentListResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.post("fetch", "/:db/_all_docs", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        query: Schema.Unknown,
        success: DocumentFetchResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      // ─── Mango ───
      HttpApiEndpoint.get("listIndexes", "/:db/_index", {
        params: Schema.Struct({ db: Schema.String }),
        success: IndexListResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoInternalServerErrorWire],
      }),
      HttpApiEndpoint.post("createIndex", "/:db/_index", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        success: [CreateIndexResponse, CreateIndexResponse.pipe(HttpApiSchema.status(201))],
        error: [
          CenoBadRequestWire,
          CenoUnauthorizedWire,
          CenoForbiddenWire,
          CenoNotFoundWire,
          CenoInternalServerErrorWire,
        ],
      }),
      HttpApiEndpoint["delete"]("deleteIndex", "/:db/_index/:ddoc/json/:name", {
        params: Schema.Struct({ db: Schema.String, ddoc: Schema.String, name: Schema.String }),
        success: OkResponse,
        error: [
          CenoBadRequestWire,
          CenoUnauthorizedWire,
          CenoForbiddenWire,
          CenoNotFoundWire,
          CenoInternalServerErrorWire,
        ],
      }),
      HttpApiEndpoint.post("find", "/:db/_find", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        success: MangoResponse,
        error: [
          CenoBadRequestWire,
          CenoUnauthorizedWire,
          CenoForbiddenWire,
          CenoNotFoundWire,
          CenoInternalServerErrorWire,
        ],
      }),
      HttpApiEndpoint.post("explain", "/:db/_explain", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        success: Schema.Unknown,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoInternalServerErrorWire],
      }),
      // ─── Attachments ───
      HttpApiEndpoint.put("attachmentInsert", "/:db/:docid/:attname", {
        params: Schema.Struct({
          db: Schema.String,
          docid: Schema.String,
          attname: Schema.String,
        }),
        query: Schema.Struct({ rev: Schema.optional(Schema.String) }),
        payload: Schema.Unknown,
        success: [
          DocumentInsertResponse.pipe(HttpApiSchema.status(201)),
          DocumentInsertResponse.pipe(HttpApiSchema.status(202)),
        ],
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
      }),
      HttpApiEndpoint.get("attachmentGet", "/:db/:docid/:attname", {
        params: Schema.Struct({
          db: Schema.String,
          docid: Schema.String,
          attname: Schema.String,
        }),
        query: Schema.Struct({ rev: Schema.optional(Schema.String) }),
        success: HttpApiSchema.StreamUint8Array(),
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.head("attachmentHead", "/:db/:docid/:attname", {
        params: Schema.Struct({
          db: Schema.String,
          docid: Schema.String,
          attname: Schema.String,
        }),
        success: Schema.Void,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint["delete"]("attachmentDestroy", "/:db/:docid/:attname", {
        params: Schema.Struct({
          db: Schema.String,
          docid: Schema.String,
          attname: Schema.String,
        }),
        query: Schema.Struct({ rev: Schema.String, batch: Schema.optional(Schema.String) }),
        success: [DocumentDestroyResponse, DocumentDestroyResponse.pipe(HttpApiSchema.status(202))],
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
      }),
      // ─── Streaming variants ───
      HttpApiEndpoint.get("listStream", "/:db/_all_docs", {
        params: Schema.Struct({ db: Schema.String }),
        query: Schema.Unknown,
        success: HttpApiSchema.StreamUint8Array(),
      }),
      HttpApiEndpoint.post("findStream", "/:db/_find", {
        params: Schema.Struct({ db: Schema.String }),
        payload: Schema.Unknown,
        success: HttpApiSchema.StreamUint8Array(),
      }),
      // ─── Partitioned database ───
      HttpApiEndpoint.get("partitionInfo", "/:db/_partition/:partition", {
        params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
        success: PartitionInfoResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.get("partitionedList", "/:db/_partition/:partition/_all_docs", {
        params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
        query: Schema.Unknown,
        success: DocumentListResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.post("partitionedFind", "/:db/_partition/:partition/_find", {
        params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
        payload: Schema.Unknown,
        success: MangoResponse,
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

  /** Provides the CouchDB-backed document service; requires a {@link CouchDbClient}. */
  export const layer = Layer.effect(
    Document,
    Effect.gen(function* () {
      const connect = yield* CouchDbClient;
      const client = yield* connect(Api);

      const wantsStream = (o: unknown): o is { readonly stream: true } =>
        typeof o === "object" && o !== null && "stream" in o && o.stream === true;

      // A successful HEAD means the resource exists; a 404 is the negative answer
      // rather than an error. CouchDB sends no body on a HEAD, so a miss arrives
      // as a raw 404 status code rather than a decoded CenoNotFound.
      const foldExists = <E extends { readonly _tag: string }>(effect: Effect.Effect<void, E>) =>
        effect.pipe(
          Effect.as(true),
          Effect.catchIf(
            (error): error is Extract<E, { _tag: "CenoNotFound" }> => error._tag === "CenoNotFound",
            () => Effect.succeed(false),
          ),
          Effect.catchIf(
            (error) =>
              error._tag === "HttpClientError" &&
              "reason" in error &&
              typeof error.reason === "object" &&
              error.reason !== null &&
              "_tag" in error.reason &&
              error.reason._tag === "StatusCodeError" &&
              "response" in error.reason &&
              typeof error.reason.response === "object" &&
              error.reason.response !== null &&
              "status" in error.reason.response &&
              error.reason.response.status === 404,
            () => Effect.succeed(false),
          ),
        );

      // `list` returns the parsed listing by default; `{ stream: true }` opens
      // the decoded-text stream of the same `_all_docs` endpoint. The dispatch is
      // shared so both the db-passing form and the `in(db)`-scoped form reuse it.
      const listDispatch = (db: string, options?: unknown) =>
        Match.value(options).pipe(
          Match.when(wantsStream, ({ stream: _stream, ...query }) =>
            Effect.map(client.listStream({ params: { db }, query }), Stream.decodeText()),
          ),
          Match.orElse((query) => client.list({ params: { db }, query: query ?? {} })),
        );
      function list(
        db: string,
        options?: DocumentListParams,
      ): Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
      function list(
        db: string,
        options: DocumentListParams & { readonly stream: true },
      ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
      function list(db: string, options?: unknown) {
        return listDispatch(db, options);
      }

      // `find` runs the Mango query and returns the parsed response by default;
      // `{ stream: true }` opens the decoded-text stream of the same `_find`
      // endpoint, with the flag stripped from the forwarded body.
      const findDispatch = (db: string, query: MangoQuery & { readonly stream?: true }) =>
        Match.value(query).pipe(
          Match.when(wantsStream, ({ stream: _stream, ...payload }) =>
            Effect.map(client.findStream({ params: { db }, payload }), Stream.decodeText()),
          ),
          Match.orElse((payload) => client.find({ params: { db }, payload })),
        );
      function find(
        db: string,
        query: MangoQuery,
      ): Effect.Effect<
        MangoResponse,
        CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
      >;
      function find(
        db: string,
        query: MangoQuery & { readonly stream: true },
      ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
      function find(db: string, query: MangoQuery & { readonly stream?: true }) {
        return findDispatch(db, query);
      }

      // The `in(db)` view re-binds every operation to a fixed database. `list`
      // and `find` keep their stream overloads via their own signatures.
      const makeScoped = (db: string): Document.DatabaseDocument => {
        function scopedList(
          options?: DocumentListParams,
        ): Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
        function scopedList(
          options: DocumentListParams & { readonly stream: true },
        ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
        function scopedList(options?: unknown) {
          return listDispatch(db, options);
        }
        function scopedFind(
          query: MangoQuery,
        ): Effect.Effect<
          MangoResponse,
          CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
        >;
        function scopedFind(
          query: MangoQuery & { readonly stream: true },
        ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
        function scopedFind(query: MangoQuery & { readonly stream?: true }) {
          return findDispatch(db, query);
        }
        return {
          insert: (body, opts) => document.insert(db, body, opts),
          put: (docid, body, opts) => document.put(db, docid, body, opts),
          get: (docid, opts) => document.get(db, docid, opts),
          exists: (docid) => document.exists(db, docid),
          destroy: (docid, rev, opts) => document.destroy(db, docid, rev, opts),
          list: scopedList,
          fetch: (keys, opts) => document.fetch(db, keys, opts),
          find: scopedFind,
          explain: (query) => document.explain(db, query),
          bulk: {
            write: (docs) => document.bulk.write(db, docs),
            get: (docs) => document.bulk.get(db, docs),
          },
          index: {
            list: () => document.index.list(db),
            create: (index) => document.index.create(db, index),
            delete: (ddoc, name) => document.index.delete(db, ddoc, name),
          },
          attachment: {
            insert: (docid, attname, data, opts) => document.attachment.insert(db, docid, attname, data, opts),
            get: (docid, attname, opts) => document.attachment.get(db, docid, attname, opts),
            exists: (docid, attname) => document.attachment.exists(db, docid, attname),
            destroy: (docid, attname, rev, opts) => document.attachment.destroy(db, docid, attname, rev, opts),
          },
          partition: {
            info: (partition) => document.partition.info(db, partition),
            list: (partition, opts) => document.partition.list(db, partition, opts),
            find: (partition, query) => document.partition.find(db, partition, query),
          },
        };
      };

      const document: Document.Document = {
        insert: (db, body, opts) => client.insert({ params: { db }, payload: body, query: { batch: opts?.batch } }),
        put: (db, docid, body, opts) =>
          client.insertWithId({
            params: { db, docid },
            payload: body,
            query: { rev: opts?.rev, batch: opts?.batch, new_edits: opts?.new_edits },
          }),
        get: (db, docid, opts) => client.get({ params: { db, docid }, query: opts ?? {} }),
        exists: (db, docid) => foldExists(client.head({ params: { db, docid } })),
        destroy: (db, docid, rev, opts) =>
          client.destroy({ params: { db, docid }, query: { rev, batch: opts?.batch } }),
        list,
        fetch: (db, keys, opts) => client.fetch({ params: { db }, payload: { keys }, query: opts ?? {} }),
        find,
        explain: (db, query) => client.explain({ params: { db }, payload: query }),
        bulk: {
          write: (db, docs) => client.bulk({ params: { db }, payload: { docs } }),
          get: (db, docs) => client.bulkGet({ params: { db }, payload: { docs } }),
        },
        index: {
          list: (db) => client.listIndexes({ params: { db } }),
          create: (db, index) => client.createIndex({ params: { db }, payload: index }),
          delete: (db, ddoc, name) => client.deleteIndex({ params: { db, ddoc, name } }),
        },
        attachment: {
          insert: (db, docid, attname, data, opts) =>
            client.attachmentInsert({ params: { db, docid, attname }, payload: data, query: { rev: opts?.rev } }),
          get: (db, docid, attname, opts) =>
            client.attachmentGet({ params: { db, docid, attname }, query: { rev: opts?.rev } }),
          exists: (db, docid, attname) => foldExists(client.attachmentHead({ params: { db, docid, attname } })),
          destroy: (db, docid, attname, rev, opts) =>
            client.attachmentDestroy({ params: { db, docid, attname }, query: { rev, batch: opts?.batch } }),
        },
        partition: {
          info: (db, partition) => client.partitionInfo({ params: { db, partition } }),
          list: (db, partition, opts) => client.partitionedList({ params: { db, partition }, query: opts ?? {} }),
          find: (db, partition, query) => client.partitionedFind({ params: { db, partition }, payload: query }),
        },
        in: makeScoped,
      };
      return Document.of(document);
    }),
  );
}
