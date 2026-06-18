import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import {
  NenoBadContentTypeWire,
  NenoBadRequestWire,
  NenoConflictWire,
  NenoForbiddenWire,
  NenoInternalServerErrorWire,
  NenoNotFoundWire,
  NenoUnauthorizedWire,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Response from document insert or update. */
export const DocumentInsertResponse = Schema.Struct({
  id: Schema.String,
  ok: Schema.Boolean,
  rev: Schema.String,
});

/** Response from document delete. */
export const DocumentDestroyResponse = Schema.Struct({
  id: Schema.String,
  ok: Schema.Boolean,
  rev: Schema.String,
});

/** Single result from `_bulk_docs`. */
export const DocumentBulkResponse = Schema.Struct({
  id: Schema.String,
  rev: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
});

/** Row from `_all_docs` with optional doc body. */
export const DocumentResponseRow = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  value: Schema.Struct({ rev: Schema.String }),
  error: Schema.optional(Schema.String),
  doc: Schema.optional(Schema.Unknown),
});

/** Response from `_all_docs`. */
export const DocumentListResponse = Schema.Struct({
  offset: Schema.Number,
  rows: Schema.Array(DocumentResponseRow),
  total_rows: Schema.Number,
  update_seq: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
});

/** Lookup failure from `_all_docs` fetch. */
const DocumentLookupFailure = Schema.Struct({
  key: Schema.String,
  error: Schema.String,
});

/** Response from `_all_docs` fetch. */
export const DocumentFetchResponse = Schema.Struct({
  offset: Schema.Number,
  rows: Schema.Array(Schema.Union([DocumentResponseRow, DocumentLookupFailure])),
  total_rows: Schema.Number,
  update_seq: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
});

/** Row from a view query. */
const DocumentViewResponseRow = Schema.Struct({
  id: Schema.String,
  key: Schema.Unknown,
  value: Schema.Unknown,
  doc: Schema.optional(Schema.Unknown),
});

/** View query response. */
export const DocumentViewResponse = Schema.Struct({
  offset: Schema.Number,
  rows: Schema.Array(DocumentViewResponseRow),
  total_rows: Schema.Number,
  update_seq: Schema.optional(Schema.Unknown),
});

/** Row from a search query. */
const DocumentSearchResponseRow = Schema.Struct({
  id: Schema.String,
  order: Schema.Array(Schema.Number),
  fields: Schema.Unknown,
  key: Schema.String,
  doc: Schema.optional(Schema.Unknown),
});

/** Search query response. */
export const DocumentSearchResponse = Schema.Struct({
  rows: Schema.Array(DocumentSearchResponseRow),
  total_rows: Schema.Number,
  bookmark: Schema.String,
  counts: Schema.optional(Schema.Unknown),
  ranges: Schema.optional(Schema.Unknown),
  highlights: Schema.optional(Schema.Unknown),
});

/** Mango query execution stats. */
const MangoExecutionStats = Schema.Struct({
  total_keys_examined: Schema.Number,
  total_docs_examined: Schema.Number,
  total_quorum_docs_examined: Schema.Number,
  results_returned: Schema.Number,
  execution_time_ms: Schema.Number,
});

/** Mango query response. */
export const MangoResponse = Schema.Struct({
  docs: Schema.Array(Schema.Unknown),
  bookmark: Schema.optional(Schema.String),
  warning: Schema.optional(Schema.String),
  execution_stats: Schema.optional(MangoExecutionStats),
});

/** Response from creating an index. */
export const CreateIndexResponse = Schema.Struct({
  result: Schema.String,
  id: Schema.String,
  name: Schema.String,
});

/** Partition info response. */
export const PartitionInfoResponse = Schema.Struct({
  db_name: Schema.String,
  sizes: Schema.Struct({ active: Schema.Number, external: Schema.Number }),
  partition: Schema.String,
  doc_count: Schema.Number,
  doc_del_count: Schema.Number,
});

// ---------------------------------------------------------------------------
// Parameter Types
// ---------------------------------------------------------------------------

/** Params for document insert or update. */
export interface DocumentInsertParams {
  readonly docName?: string;
  readonly rev?: string;
  readonly batch?: "ok";
  readonly new_edits?: boolean;
}

/** Params for getting a document. */
export interface DocumentGetParams {
  readonly attachments?: boolean;
  readonly att_encoding_info?: boolean;
  readonly atts_since?: readonly unknown[];
  readonly conflicts?: boolean;
  readonly deleted_conflicts?: boolean;
  readonly latest?: boolean;
  readonly local_seq?: boolean;
  readonly meta?: boolean;
  readonly open_revs?: readonly unknown[];
  readonly rev?: string;
  readonly revs?: boolean;
  readonly revs_info?: boolean;
}

/** Params for `_all_docs` listing. */
export interface DocumentListParams {
  readonly conflicts?: boolean;
  readonly descending?: boolean;
  readonly endkey?: string;
  readonly end_key?: string;
  readonly end_key_doc_id?: string;
  readonly include_docs?: boolean;
  readonly inclusive_end?: boolean;
  readonly key?: string;
  readonly keys?: string | readonly string[];
  readonly limit?: number;
  readonly skip?: number;
  readonly stale?: string;
  readonly startkey?: string;
  readonly start_key?: string;
  readonly start_key_doc_id?: string;
  readonly update_seq?: boolean;
}

/** Params for `_all_docs` fetch. */
export interface DocumentFetchParams {
  readonly conflicts?: boolean;
  readonly descending?: boolean;
  readonly end_key?: string;
  readonly end_key_doc_id?: string;
  readonly include_docs?: boolean;
  readonly inclusive_end?: boolean;
  readonly key?: string;
  readonly keys?: string | readonly string[];
  readonly limit?: number;
  readonly skip?: number;
  readonly stale?: string;
  readonly start_key?: string;
  readonly start_key_doc_id?: string;
  readonly update_seq?: boolean;
}

/** Params for a view query. */
export interface DocumentViewParams {
  readonly conflicts?: boolean;
  readonly descending?: boolean;
  readonly endkey?: unknown;
  readonly end_key?: unknown;
  readonly endkey_docid?: string;
  readonly end_key_doc_id?: string;
  readonly group?: boolean;
  readonly group_level?: number;
  readonly include_docs?: boolean;
  readonly attachments?: boolean;
  readonly att_encoding_info?: boolean;
  readonly inclusive_end?: boolean;
  readonly key?: unknown;
  readonly keys?: readonly unknown[];
  readonly limit?: number;
  readonly reduce?: boolean;
  readonly skip?: number;
  readonly sorted?: boolean;
  readonly stable?: boolean;
  readonly stale?: string;
  readonly startkey?: unknown;
  readonly start_key?: unknown;
  readonly startkey_docid?: string;
  readonly start_key_doc_id?: string;
  readonly update?: string;
  readonly update_seq?: boolean;
}

/** Params for a search query. */
export interface DocumentSearchParams {
  readonly bookmark?: string;
  readonly counts?: readonly string[];
  readonly drilldown?: readonly string[];
  readonly group_field?: string;
  readonly group_limit?: number;
  readonly group_sort?: string | readonly string[];
  readonly highlight_fields?: readonly string[];
  readonly highlight_pre_tag?: string;
  readonly highlight_post_tag?: string;
  readonly highlight_number?: number;
  readonly highlight_size?: number;
  readonly include_docs?: boolean;
  readonly include_fields?: readonly string[];
  readonly limit?: number;
  readonly q?: string;
  readonly query?: string;
  readonly ranges?: object;
  readonly sort?: string | readonly string[];
  readonly stale?: boolean;
}

/** Mango selector. */
export type MangoSelector = { readonly [K: string]: MangoSelector | MangoSelector[] | MangoValue | MangoValue[] };
export type MangoValue = number | string | boolean | object | null;
export type SortOrder = string | readonly string[] | { readonly [key: string]: "asc" | "desc" };

/** Mango query body. */
export interface MangoQuery {
  readonly selector: MangoSelector;
  readonly limit?: number;
  readonly skip?: number;
  readonly sort?: readonly SortOrder[];
  readonly fields?: readonly string[];
  readonly use_index?: string | readonly [string, string];
  readonly r?: number;
  readonly bookmark?: string;
  readonly update?: boolean;
  readonly stable?: boolean;
  readonly stale?: "ok" | false;
  readonly execution_stats?: boolean;
}

/** Create index request body. */
export interface CreateIndexRequest {
  readonly index: {
    readonly fields: readonly SortOrder[];
    readonly partial_filter_selector?: MangoSelector;
  };
  readonly ddoc?: string;
  readonly name?: string;
  readonly type?: "json" | "text";
  readonly partitioned?: boolean;
}

/** Wrapper for `_bulk_docs` insert. */
export interface BulkModifyDocsWrapper {
  readonly docs: readonly unknown[];
}

/** Wrapper for `_all_docs` bulk fetch. */
export interface BulkFetchDocsWrapper {
  readonly keys: readonly string[];
}

/** Document that may have `_id` and `_rev`. */
export interface MaybeDocument {
  readonly _id?: string;
  readonly _rev?: string;
}

/** Attachment data. */
export interface AttachmentData {
  readonly name: string;
  readonly data: unknown;
  readonly content_type: string;
}

/** Changes reader options. */
export interface ChangesReaderOptions {
  readonly batchSize?: number;
  readonly fastChanges?: boolean;
  readonly since?: string | number;
  readonly includeDocs?: boolean;
  readonly timeout?: number;
  readonly wait?: boolean;
  readonly qs?: object;
  readonly selector?: MangoSelector;
}

// ---------------------------------------------------------------------------
// API Group
// ---------------------------------------------------------------------------

/** Document CRUD, bulk, index, view, and search endpoints. */
export const DocumentApi = HttpApiGroup.make("document")
  // ─── CRUD ───
  .add(
    HttpApiEndpoint.post("insert", "/:db", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: DocumentInsertResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoForbiddenWire, NenoNotFoundWire, NenoConflictWire],
    }),
  )
  .add(
    HttpApiEndpoint.put("insertWithId", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      payload: Schema.Unknown,
      query: Schema.Struct({ rev: Schema.optional(Schema.String) }),
      success: DocumentInsertResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoForbiddenWire, NenoNotFoundWire, NenoConflictWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("get", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      query: Schema.Unknown,
      success: Schema.Unknown,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.head("head", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      success: Schema.Void,
    }),
  )
  .add(
    HttpApiEndpoint["delete"]("destroy", "/:db/:docid", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String }),
      query: Schema.Struct({ rev: Schema.String }),
      success: DocumentDestroyResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire, NenoConflictWire],
    }),
  )
  // ─── Bulk ───
  .add(
    HttpApiEndpoint.post("bulk", "/:db/_bulk_docs", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: Schema.Array(DocumentBulkResponse),
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoForbiddenWire, NenoBadContentTypeWire],
    }),
  )
  // ─── All docs ───
  .add(
    HttpApiEndpoint.get("list", "/:db/_all_docs", {
      params: Schema.Struct({ db: Schema.String }),
      query: Schema.Unknown,
      success: DocumentListResponse,
      error: [NenoUnauthorizedWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("listStream", "/:db/_all_docs", {
      params: Schema.Struct({ db: Schema.String }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
  )
  .add(
    HttpApiEndpoint.post("fetch", "/:db/_all_docs", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      query: Schema.Unknown,
      success: DocumentFetchResponse,
      error: [NenoUnauthorizedWire],
    }),
  )
  // ─── Mango ───
  .add(
    HttpApiEndpoint.post("createIndex", "/:db/_index", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: CreateIndexResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoInternalServerErrorWire],
    }),
  )
  .add(
    HttpApiEndpoint.post("find", "/:db/_find", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: MangoResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoInternalServerErrorWire],
    }),
  )
  .add(
    HttpApiEndpoint.post("findStream", "/:db/_find", {
      params: Schema.Struct({ db: Schema.String }),
      payload: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
  )
  // ─── Design documents: views ───
  .add(
    HttpApiEndpoint.get("view", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({ db: Schema.String, ddoc: Schema.String, viewname: Schema.String }),
      query: Schema.Unknown,
      success: DocumentViewResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("viewStream", "/:db/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({ db: Schema.String, ddoc: Schema.String, viewname: Schema.String }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
  )
  // ─── Design documents: search ───
  .add(
    HttpApiEndpoint.get("search", "/:db/_design/:ddoc/_search/:index", {
      params: Schema.Struct({ db: Schema.String, ddoc: Schema.String, index: Schema.String }),
      query: Schema.Unknown,
      success: DocumentSearchResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire, NenoInternalServerErrorWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("searchStream", "/:db/_design/:ddoc/_search/:index", {
      params: Schema.Struct({ db: Schema.String, ddoc: Schema.String, index: Schema.String }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
  )
  // ─── Design documents: show / update ───
  .add(
    HttpApiEndpoint.get("show", "/:db/_design/:ddoc/_show/:func/:docid", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        func: Schema.String,
        docid: Schema.String,
      }),
      query: Schema.Unknown,
      success: Schema.Unknown,
      error: [NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.put("updateHandler", "/:db/_design/:ddoc/_update/:func/:docid", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        func: Schema.String,
        docid: Schema.String,
      }),
      payload: Schema.Unknown,
      success: Schema.Unknown,
      error: [NenoNotFoundWire, NenoConflictWire, NenoInternalServerErrorWire],
    }),
  )
  // ─── Design documents: list (apply list function to view) ───
  .add(
    HttpApiEndpoint.get("viewWithList", "/:db/_design/:ddoc/_list/:list/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        ddoc: Schema.String,
        list: Schema.String,
        viewname: Schema.String,
      }),
      query: Schema.Unknown,
      success: Schema.Unknown,
      error: [NenoBadRequestWire, NenoNotFoundWire, NenoInternalServerErrorWire],
    }),
  )
  // ─── Attachments ───
  .add(
    HttpApiEndpoint.put("attachmentInsert", "/:db/:docid/:attname", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String, attname: Schema.String }),
      query: Schema.Struct({ rev: Schema.optional(Schema.String) }),
      payload: Schema.Unknown,
      success: DocumentInsertResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire, NenoConflictWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("attachmentGet", "/:db/:docid/:attname", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String, attname: Schema.String }),
      success: HttpApiSchema.StreamUint8Array(),
      error: [NenoUnauthorizedWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint["delete"]("attachmentDestroy", "/:db/:docid/:attname", {
      params: Schema.Struct({ db: Schema.String, docid: Schema.String, attname: Schema.String }),
      query: Schema.Struct({ rev: Schema.String }),
      success: DocumentDestroyResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire, NenoConflictWire],
    }),
  )
  // ─── Partitioned database ───
  .add(
    HttpApiEndpoint.get("partitionInfo", "/:db/_partition/:partition", {
      params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
      success: PartitionInfoResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("partitionedList", "/:db/_partition/:partition/_all_docs", {
      params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
      query: Schema.Unknown,
      success: DocumentListResponse,
      error: [NenoUnauthorizedWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.post("partitionedFind", "/:db/_partition/:partition/_find", {
      params: Schema.Struct({ db: Schema.String, partition: Schema.String }),
      payload: Schema.Unknown,
      success: MangoResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire, NenoInternalServerErrorWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("partitionedView", "/:db/_partition/:partition/_design/:ddoc/_view/:viewname", {
      params: Schema.Struct({
        db: Schema.String,
        partition: Schema.String,
        ddoc: Schema.String,
        viewname: Schema.String,
      }),
      query: Schema.Unknown,
      success: DocumentViewResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("partitionedSearch", "/:db/_partition/:partition/_design/:ddoc/_search/:index", {
      params: Schema.Struct({
        db: Schema.String,
        partition: Schema.String,
        ddoc: Schema.String,
        index: Schema.String,
      }),
      query: Schema.Unknown,
      success: DocumentSearchResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoNotFoundWire, NenoInternalServerErrorWire],
    }),
  );
