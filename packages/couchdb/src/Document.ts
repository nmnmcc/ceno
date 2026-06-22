import { OkResponse } from "@ceno/core/Database";
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
  PartitionInfoResponse,
} from "@ceno/core/Document";
import { Effect, Layer, Schema, Stream } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./Client.ts";
import {
  CenoBadContentTypeWire,
  CenoBadRequestWire,
  CenoConflictWire,
  CenoForbiddenWire,
  CenoInternalServerErrorWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./Errors.ts";

/** Self-contained HttpApi for CouchDB document endpoints, independent of the other scopes. */
export const Api = HttpApi.make("document").add(
  HttpApiGroup.make("document", { topLevel: true }).add(
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

    const makeDatabasePartitioned = (db: string, partition: string): Document.DatabasePartitionedDocument => ({
      info: () => document.partitionInfo(db, partition),
      list: (opts) => document.partitionedList(db, partition, opts),
      find: (query) => document.partitionedFind(db, partition, query),
    });

    const makeScoped = (db: string): Document.DatabaseDocument => ({
      insert: (body, opts) => document.insert(db, body, opts),
      put: (docid, body, opts) => document.put(db, docid, body, opts),
      get: (docid, opts) => document.get(db, docid, opts),
      exists: (docid) => document.exists(db, docid),
      destroy: (docid, rev, opts) => document.destroy(db, docid, rev, opts),
      bulk: (docs) => document.bulk(db, docs),
      bulkGet: (docs) => document.bulkGet(db, docs),
      list: (opts) => document.list(db, opts),
      listStream: (opts) => document.listStream(db, opts),
      fetch: (keys, opts) => document.fetch(db, keys, opts),
      listIndexes: () => document.listIndexes(db),
      createIndex: (index) => document.createIndex(db, index),
      deleteIndex: (ddoc, name) => document.deleteIndex(db, ddoc, name),
      find: (query) => document.find(db, query),
      findStream: (query) => document.findStream(db, query),
      explain: (query) => document.explain(db, query),
      attachmentInsert: (docid, attname, data, opts) => document.attachmentInsert(db, docid, attname, data, opts),
      attachmentGet: (docid, attname, opts) => document.attachmentGet(db, docid, attname, opts),
      attachmentExists: (docid, attname) => document.attachmentExists(db, docid, attname),
      attachmentDestroy: (docid, attname, rev, opts) => document.attachmentDestroy(db, docid, attname, rev, opts),
      partitionInfo: (partition) => document.partitionInfo(db, partition),
      partitionedList: (partition, opts) => document.partitionedList(db, partition, opts),
      partitionedFind: (partition, query) => document.partitionedFind(db, partition, query),
      partitioned: (partition) => makeDatabasePartitioned(db, partition),
    });

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
      bulk: (db, docs) => client.bulk({ params: { db }, payload: { docs } }),
      bulkGet: (db, docs) => client.bulkGet({ params: { db }, payload: { docs } }),
      list: (db, opts) => client.list({ params: { db }, query: opts ?? {} }),
      listStream: (db, opts) =>
        Effect.map(client.listStream({ params: { db }, query: opts ?? {} }), Stream.decodeText()),
      fetch: (db, keys, opts) => client.fetch({ params: { db }, payload: { keys }, query: opts ?? {} }),
      listIndexes: (db) => client.listIndexes({ params: { db } }),
      createIndex: (db, index) => client.createIndex({ params: { db }, payload: index }),
      deleteIndex: (db, ddoc, name) => client.deleteIndex({ params: { db, ddoc, name } }),
      find: (db, query) => client.find({ params: { db }, payload: query }),
      findStream: (db, query) =>
        Effect.map(client.findStream({ params: { db }, payload: query }), Stream.decodeText()),
      explain: (db, query) => client.explain({ params: { db }, payload: query }),
      attachmentInsert: (db, docid, attname, data, opts) =>
        client.attachmentInsert({ params: { db, docid, attname }, payload: data, query: { rev: opts?.rev } }),
      attachmentGet: (db, docid, attname, opts) =>
        client.attachmentGet({ params: { db, docid, attname }, query: { rev: opts?.rev } }),
      attachmentExists: (db, docid, attname) => foldExists(client.attachmentHead({ params: { db, docid, attname } })),
      attachmentDestroy: (db, docid, attname, rev, opts) =>
        client.attachmentDestroy({ params: { db, docid, attname }, query: { rev, batch: opts?.batch } }),
      partitionInfo: (db, partition) => client.partitionInfo({ params: { db, partition } }),
      partitionedList: (db, partition, opts) =>
        client.partitionedList({ params: { db, partition }, query: opts ?? {} }),
      partitionedFind: (db, partition, query) =>
        client.partitionedFind({ params: { db, partition }, payload: query }),
      partitioned: (partition) => ({
        info: (db) => document.partitionInfo(db, partition),
        list: (db, opts) => document.partitionedList(db, partition, opts),
        find: (db, query) => document.partitionedFind(db, partition, query),
      }),
      in: makeScoped,
    };
    return Document.of(document);
  }),
);
