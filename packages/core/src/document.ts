import { Context, Schema, type Effect, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type {
  CenoBadContentType,
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./errors";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Response from document insert or update. */
export const DocumentInsertResponse = Schema.Struct({
  id: Schema.String,
  ok: Schema.Boolean,
  rev: Schema.String,
});
export type DocumentInsertResponse = typeof DocumentInsertResponse.Type;

/** Response from document delete. */
export const DocumentDestroyResponse = Schema.Struct({
  id: Schema.String,
  ok: Schema.Boolean,
  rev: Schema.String,
});
export type DocumentDestroyResponse = typeof DocumentDestroyResponse.Type;

/** Single result from `_bulk_docs`. */
export const DocumentBulkResponse = Schema.Struct({
  id: Schema.String,
  rev: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
});
export type DocumentBulkResponse = typeof DocumentBulkResponse.Type;

/** Row from `_all_docs` with optional doc body. */
export const DocumentResponseRow = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  value: Schema.Struct({ rev: Schema.String }),
  error: Schema.optional(Schema.String),
  doc: Schema.optional(Schema.Unknown),
});
export type DocumentResponseRow = typeof DocumentResponseRow.Type;

/** Response from `_all_docs`. */
export const DocumentListResponse = Schema.Struct({
  offset: Schema.Number,
  rows: Schema.Array(DocumentResponseRow),
  total_rows: Schema.Number,
  update_seq: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
});
export type DocumentListResponse = typeof DocumentListResponse.Type;

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
export type DocumentFetchResponse = typeof DocumentFetchResponse.Type;

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
export type MangoResponse = typeof MangoResponse.Type;

/** Response from creating an index. */
export const CreateIndexResponse = Schema.Struct({
  result: Schema.String,
  id: Schema.String,
  name: Schema.String,
});
export type CreateIndexResponse = typeof CreateIndexResponse.Type;

/** Partition info response. */
export const PartitionInfoResponse = Schema.Struct({
  db_name: Schema.String,
  sizes: Schema.Struct({ active: Schema.Number, external: Schema.Number }),
  partition: Schema.String,
  doc_count: Schema.Number,
  doc_del_count: Schema.Number,
});
export type PartitionInfoResponse = typeof PartitionInfoResponse.Type;

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

/** Mango selector. */
export type MangoSelector = {
  readonly [K: string]: MangoSelector | MangoSelector[] | MangoValue | MangoValue[];
};
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
// Service
// ---------------------------------------------------------------------------

/** CouchDB document CRUD, bulk operations, Mango queries, and attachments. */
export class Document extends Context.Service<Document, Document.Document>()("@ceno/core/Document") {}

export namespace Document {
  /** Service shape for document-level CouchDB operations. */
  export interface Document {
    /** Inserts a document with server-generated or body-provided ID. */
    readonly insert: (
      db: string,
      body: unknown,
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Creates or updates a document at a specific ID. */
    readonly put: (
      db: string,
      docid: string,
      body: unknown,
      options?: { readonly rev?: string },
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Retrieves a document by ID. */
    readonly get: (
      db: string,
      docid: string,
      options?: DocumentGetParams,
    ) => Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoNotFound | TransportError>;
    /** Checks whether a document exists (HEAD request). */
    readonly head: (db: string, docid: string) => Effect.Effect<void, TransportError>;
    /** Deletes a document by ID and revision. */
    readonly destroy: (
      db: string,
      docid: string,
      rev: string,
    ) => Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoConflict | TransportError
    >;
    /** Inserts or updates multiple documents in bulk. */
    readonly bulk: (
      db: string,
      docs: readonly unknown[],
    ) => Effect.Effect<
      readonly DocumentBulkResponse[],
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoBadContentType | TransportError
    >;
    /** Lists all documents in a database. */
    readonly list: (
      db: string,
      options?: DocumentListParams,
    ) => Effect.Effect<DocumentListResponse, CenoUnauthorized | TransportError>;
    /** Fetches specific documents by keys. */
    readonly fetch: (
      db: string,
      keys: readonly string[],
      options?: DocumentFetchParams,
    ) => Effect.Effect<DocumentFetchResponse, CenoUnauthorized | TransportError>;
    /** Creates a Mango index. */
    readonly createIndex: (
      db: string,
      index: CreateIndexRequest,
    ) => Effect.Effect<
      CreateIndexResponse,
      CenoBadRequest | CenoUnauthorized | CenoInternalServerError | TransportError
    >;
    /** Executes a Mango query. */
    readonly find: (
      db: string,
      query: MangoQuery,
    ) => Effect.Effect<MangoResponse, CenoBadRequest | CenoUnauthorized | CenoInternalServerError | TransportError>;
    /** Uploads an attachment to a document. */
    readonly attachmentInsert: (
      db: string,
      docid: string,
      attname: string,
      data: unknown,
      options?: { readonly rev?: string },
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoConflict | TransportError
    >;
    /** Downloads an attachment as a byte stream. */
    readonly attachmentGet: (
      db: string,
      docid: string,
      attname: string,
    ) => Effect.Effect<
      Stream.Stream<Uint8Array, HttpClientError.HttpClientError>,
      CenoUnauthorized | CenoNotFound | TransportError
    >;
    /** Deletes an attachment from a document. */
    readonly attachmentDestroy: (
      db: string,
      docid: string,
      attname: string,
      rev: string,
    ) => Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoConflict | TransportError
    >;
    /** Streams all documents as raw bytes. */
    readonly listStream: (
      db: string,
      options?: DocumentListParams,
    ) => Effect.Effect<Stream.Stream<Uint8Array, HttpClientError.HttpClientError>, TransportError>;
    /** Streams Mango query results as raw bytes. */
    readonly findStream: (
      db: string,
      query: MangoQuery,
    ) => Effect.Effect<Stream.Stream<Uint8Array, HttpClientError.HttpClientError>, TransportError>;
    /** Retrieves partition metadata. */
    readonly partitionInfo: (
      db: string,
      partition: string,
    ) => Effect.Effect<PartitionInfoResponse, CenoBadRequest | CenoUnauthorized | CenoNotFound | TransportError>;
    /** Lists all documents in a partition. */
    readonly partitionedList: (
      db: string,
      partition: string,
      options?: DocumentListParams,
    ) => Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoNotFound | TransportError>;
    /** Executes a Mango query within a partition. */
    readonly partitionedFind: (
      db: string,
      partition: string,
      query: MangoQuery,
    ) => Effect.Effect<
      MangoResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }
}
