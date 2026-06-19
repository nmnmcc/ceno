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
import { Effect, Layer, Schema, Stream } from "effect";
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
      const methods: Omit<Document.Document, "in"> = {
        insert: (db, body, opts) => client.insert({ params: { db }, payload: body, query: { batch: opts?.batch } }),
        put: (db, docid, body, opts) =>
          client.insertWithId({
            params: { db, docid },
            payload: body,
            query: { rev: opts?.rev, batch: opts?.batch, new_edits: opts?.new_edits },
          }),
        get: (db, docid, opts) => client.get({ params: { db, docid }, query: opts ?? {} }),
        head: (db, docid) => client.head({ params: { db, docid } }),
        destroy: (db, docid, rev, opts) =>
          client.destroy({ params: { db, docid }, query: { rev, batch: opts?.batch } }),
        bulk: (db, docs) => client.bulk({ params: { db }, payload: { docs } }),
        bulkGet: (db, docs) => client.bulkGet({ params: { db }, payload: { docs } }),
        list: (db, opts) => client.list({ params: { db }, query: opts ?? {} }),
        fetch: (db, keys, opts) =>
          client.fetch({
            params: { db },
            payload: { keys },
            query: opts ?? {},
          }),
        listIndexes: (db) => client.listIndexes({ params: { db } }),
        createIndex: (db, index) => client.createIndex({ params: { db }, payload: index }),
        deleteIndex: (db, ddoc, name) => client.deleteIndex({ params: { db, ddoc, name } }),
        find: (db, query) => client.find({ params: { db }, payload: query }),
        explain: (db, query) => client.explain({ params: { db }, payload: query }),
        attachmentInsert: (db, docid, attname, data, opts) =>
          client.attachmentInsert({
            params: { db, docid, attname },
            payload: data,
            query: { rev: opts?.rev },
          }),
        attachmentGet: (db, docid, attname, opts) =>
          client.attachmentGet({
            params: { db, docid, attname },
            query: { rev: opts?.rev },
          }),
        attachmentHead: (db, docid, attname) => client.attachmentHead({ params: { db, docid, attname } }),
        attachmentDestroy: (db, docid, attname, rev, opts) =>
          client.attachmentDestroy({
            params: { db, docid, attname },
            query: { rev, batch: opts?.batch },
          }),
        listStream: (db, opts) =>
          Effect.map(client.listStream({ params: { db }, query: opts ?? {} }), Stream.decodeText()),
        findStream: (db, query) =>
          Effect.map(client.findStream({ params: { db }, payload: query }), Stream.decodeText()),
        partitionInfo: (db, partition) => client.partitionInfo({ params: { db, partition } }),
        partitionedList: (db, partition, opts) =>
          client.partitionedList({
            params: { db, partition },
            query: opts ?? {},
          }),
        partitionedFind: (db, partition, query) =>
          client.partitionedFind({
            params: { db, partition },
            payload: query,
          }),
      };
      return Document.of({
        ...methods,
        in: (db) => ({
          insert: (body, opts) => methods.insert(db, body, opts),
          put: (docid, body, opts) => methods.put(db, docid, body, opts),
          get: (docid, opts) => methods.get(db, docid, opts),
          head: (docid) => methods.head(db, docid),
          destroy: (docid, rev, opts) => methods.destroy(db, docid, rev, opts),
          bulk: (docs) => methods.bulk(db, docs),
          bulkGet: (docs) => methods.bulkGet(db, docs),
          list: (opts) => methods.list(db, opts),
          fetch: (keys, opts) => methods.fetch(db, keys, opts),
          listIndexes: () => methods.listIndexes(db),
          createIndex: (index) => methods.createIndex(db, index),
          deleteIndex: (ddoc, name) => methods.deleteIndex(db, ddoc, name),
          find: (query) => methods.find(db, query),
          explain: (query) => methods.explain(db, query),
          attachmentInsert: (docid, attname, data, opts) => methods.attachmentInsert(db, docid, attname, data, opts),
          attachmentGet: (docid, attname, opts) => methods.attachmentGet(db, docid, attname, opts),
          attachmentHead: (docid, attname) => methods.attachmentHead(db, docid, attname),
          attachmentDestroy: (docid, attname, rev, opts) => methods.attachmentDestroy(db, docid, attname, rev, opts),
          listStream: (opts) => methods.listStream(db, opts),
          findStream: (query) => methods.findStream(db, query),
          partitionInfo: (partition) => methods.partitionInfo(db, partition),
          partitionedList: (partition, opts) => methods.partitionedList(db, partition, opts),
          partitionedFind: (partition, query) => methods.partitionedFind(db, partition, query),
        }),
      });
    }),
  );
}
