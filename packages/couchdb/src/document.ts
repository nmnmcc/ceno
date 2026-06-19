import {
  CreateIndexResponse,
  Document,
  DocumentBulkResponse,
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListResponse,
  MangoResponse,
  PartitionInfoResponse,
} from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
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

// ---------------------------------------------------------------------------
// API — standalone HttpApi for the document scope
// ---------------------------------------------------------------------------

/** Self-contained HttpApi for CouchDB document CRUD, bulk ops, Mango queries, attachments, streaming, and partitioned queries, independent of the other scopes. */
export const DocumentApi = HttpApi.make("document").add(
  HttpApiGroup.make("document", { topLevel: true }).add(
    // ─── CRUD ───
    HttpApiEndpoint.post("insert", "/:db", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: DocumentInsertResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
    }),
    HttpApiEndpoint.put("insertWithId", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      payload: Schema.Unknown,
      query: Schema.Struct({ rev: Schema.optional(Schema.String) }),
      success: DocumentInsertResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoConflictWire],
    }),
    HttpApiEndpoint.get("get", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      query: Schema.Unknown,
      success: Schema.Unknown,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.head("head", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      success: Schema.Void,
    }),
    HttpApiEndpoint["delete"]("destroy", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      query: Schema.Struct({ rev: Schema.String }),
      success: DocumentDestroyResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoConflictWire],
    }),
    // ─── Bulk ───
    HttpApiEndpoint.post("bulk", "/:db/_bulk_docs", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: Schema.Array(DocumentBulkResponse),
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoBadContentTypeWire],
    }),
    // ─── All docs ───
    HttpApiEndpoint.get("list", "/:db/_all_docs", {
      params: Schema.Struct({ db: Schema.String }),
      query: Schema.Unknown,
      success: DocumentListResponse,
      error: [CenoUnauthorizedWire],
    }),
    HttpApiEndpoint.post("fetch", "/:db/_all_docs", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      query: Schema.Unknown,
      success: DocumentFetchResponse,
      error: [CenoUnauthorizedWire],
    }),
    // ─── Mango ───
    HttpApiEndpoint.post("createIndex", "/:db/_index", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: CreateIndexResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoInternalServerErrorWire],
    }),
    HttpApiEndpoint.post("find", "/:db/_find", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: MangoResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoInternalServerErrorWire],
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
      success: DocumentInsertResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoConflictWire],
    }),
    HttpApiEndpoint.get("attachmentGet", "/:db/:docid/:attname", {
      params: Schema.Struct({
        db: Schema.String,
        docid: Schema.String,
        attname: Schema.String,
      }),
      success: HttpApiSchema.StreamUint8Array(),
      error: [CenoUnauthorizedWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint["delete"]("attachmentDestroy", "/:db/:docid/:attname", {
      params: Schema.Struct({
        db: Schema.String,
        docid: Schema.String,
        attname: Schema.String,
      }),
      query: Schema.Struct({ rev: Schema.String }),
      success: DocumentDestroyResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoConflictWire],
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
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("partitionedList", "/:db/_partition/:partition/_all_docs", {
      params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
      query: Schema.Unknown,
      success: DocumentListResponse,
      error: [CenoUnauthorizedWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.post("partitionedFind", "/:db/_partition/:partition/_find", {
      params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
      payload: Schema.Unknown,
      success: MangoResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoNotFoundWire, CenoInternalServerErrorWire],
    }),
  ),
);

// ---------------------------------------------------------------------------
// Service — CouchDB HTTP implementation of @ceno/core's Document
// ---------------------------------------------------------------------------

/** Derives a document-scope client from {@link DocumentApi} and adapts it to the Document contract. */
const make = Effect.gen(function* () {
  const connect = yield* CouchDbClient;
  const client = yield* connect(DocumentApi);
  return Document.of({
    insert: (db, body) => client.insert({ params: { db }, payload: body }),
    put: (db, docid, body, opts) =>
      client.insertWithId({
        params: { db, docid },
        payload: body,
        query: { rev: opts?.rev },
      }),
    get: (db, docid, opts) => client.get({ params: { db, docid }, query: opts ?? {} }),
    head: (db, docid) => client.head({ params: { db, docid } }),
    destroy: (db, docid, rev) => client.destroy({ params: { db, docid }, query: { rev } }),
    bulk: (db, docs) => client.bulk({ params: { db }, payload: { docs } }),
    list: (db, opts) => client.list({ params: { db }, query: opts ?? {} }),
    fetch: (db, keys, opts) =>
      client.fetch({
        params: { db },
        payload: { keys },
        query: opts ?? {},
      }),
    createIndex: (db, index) => client.createIndex({ params: { db }, payload: index }),
    find: (db, query) => client.find({ params: { db }, payload: query }),
    attachmentInsert: (db, docid, attname, data, opts) =>
      client.attachmentInsert({
        params: { db, docid, attname },
        payload: data,
        query: { rev: opts?.rev },
      }),
    attachmentGet: (db, docid, attname) => client.attachmentGet({ params: { db, docid, attname } }),
    attachmentDestroy: (db, docid, attname, rev) =>
      client.attachmentDestroy({
        params: { db, docid, attname },
        query: { rev },
      }),
    listStream: (db, opts) => client.listStream({ params: { db }, query: opts ?? {} }),
    findStream: (db, query) => client.findStream({ params: { db }, payload: query }),
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
  });
});

/** Provides the CouchDB-backed document service; requires a {@link CouchDbClient}. */
export const DocumentLayer = Layer.effect(Document, make);
