import { Context, Schema, type Effect, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type { OkResponse } from "./database";
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
  ok: Schema.optional(Schema.Boolean),
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

/** Response from `_all_docs` and `_local_docs`. CouchDB returns `null` for `offset`/`total_rows` on `_local_docs`. */
export const DocumentListResponse = Schema.Struct({
  offset: Schema.NullOr(Schema.Number),
  rows: Schema.Array(DocumentResponseRow),
  total_rows: Schema.NullOr(Schema.Number),
  update_seq: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
});
export type DocumentListResponse = typeof DocumentListResponse.Type;

/** Lookup failure from `_all_docs` fetch. */
const DocumentLookupFailure = Schema.Struct({
  key: Schema.String,
  error: Schema.String,
});

/** Response from `_all_docs` fetch. CouchDB returns `null` for `offset`/`total_rows` on `_local_docs`. */
export const DocumentFetchResponse = Schema.Struct({
  offset: Schema.NullOr(Schema.Number),
  rows: Schema.Array(Schema.Union([DocumentResponseRow, DocumentLookupFailure])),
  total_rows: Schema.NullOr(Schema.Number),
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

/** Single document result from `_bulk_get`. */
const BulkGetResultDoc = Schema.Union([
  Schema.Struct({ ok: Schema.Unknown }),
  Schema.Struct({
    error: Schema.Struct({
      id: Schema.String,
      rev: Schema.String,
      error: Schema.String,
      reason: Schema.String,
    }),
  }),
]);

/** Response from `POST /{db}/_bulk_get`. */
export const BulkGetResponse = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      docs: Schema.Array(BulkGetResultDoc),
    }),
  ),
});
export type BulkGetResponse = typeof BulkGetResponse.Type;

/** Index entry from `GET /{db}/_index`. */
const IndexDef = Schema.Struct({
  ddoc: Schema.NullOr(Schema.String),
  name: Schema.String,
  type: Schema.String,
  def: Schema.Unknown,
  partitioned: Schema.optional(Schema.Boolean),
});

/** Response from `GET /{db}/_index`. */
export const IndexListResponse = Schema.Struct({
  total_rows: Schema.Number,
  indexes: Schema.Array(IndexDef),
});
export type IndexListResponse = typeof IndexListResponse.Type;

/** Response from `POST /{db}/_explain`. */
export const ExplainResponse = Schema.Unknown;
export type ExplainResponse = typeof ExplainResponse.Type;

// ---------------------------------------------------------------------------
// Parameter Types
// ---------------------------------------------------------------------------

/** Params for inserting a document via POST (server-assigned ID). */
export interface DocumentInsertParams {
  readonly batch?: "ok";
}

/** Params for creating or updating a document at a specific ID via PUT. */
export interface DocumentPutParams {
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
  readonly conflicts?: boolean;
  readonly allow_fallback?: boolean;
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

/** Params for `_bulk_get`. */
export interface BulkGetDoc {
  readonly id: string;
  readonly rev?: string;
  readonly atts_since?: readonly string[];
}

/** Params for document delete. */
export interface DocumentDestroyParams {
  readonly batch?: "ok";
}

/** Params for attachment GET. */
export interface AttachmentGetParams {
  readonly rev?: string;
}

/** Params for attachment DELETE. */
export interface AttachmentDestroyParams {
  readonly batch?: "ok";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** CouchDB document CRUD, bulk operations, Mango queries, and attachments. */
export class Document extends Context.Service<Document, Document.Document>()("@ceno/core/Document") {}

export namespace Document {
  /** Document operations narrowed to a single database, created by calling `in` on the {@link Document} service. */
  export type DatabaseDocument = {
    readonly [K in Exclude<keyof Document, "in">]: Document[K] extends (db: string, ...rest: infer R) => infer Ret
      ? (...args: R) => Ret
      : Document[K];
  };

  /** Service shape for document-level CouchDB operations. */
  export interface Document {
    /** Creates a database-scoped view of these operations, removing the `db` parameter from every method. */
    readonly in: (db: string) => DatabaseDocument;
    /** Inserts a document with server-generated or body-provided ID. */
    readonly insert: (
      db: string,
      body: unknown,
      options?: DocumentInsertParams,
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Creates or updates a document at a specific ID. */
    readonly put: (
      db: string,
      docid: string,
      body: unknown,
      options?: DocumentPutParams,
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Retrieves a document by ID. */
    readonly get: (
      db: string,
      docid: string,
      options?: DocumentGetParams,
    ) => Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Checks whether a document exists (HEAD request). */
    readonly head: (
      db: string,
      docid: string,
    ) => Effect.Effect<void, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Deletes a document by ID and revision. */
    readonly destroy: (
      db: string,
      docid: string,
      rev: string,
      options?: DocumentDestroyParams,
    ) => Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Inserts or updates multiple documents in bulk. */
    readonly bulk: (
      db: string,
      docs: readonly unknown[],
    ) => Effect.Effect<
      readonly DocumentBulkResponse[],
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Retrieves multiple documents by ID and optional revision in a single request. */
    readonly bulkGet: (
      db: string,
      docs: readonly BulkGetDoc[],
    ) => Effect.Effect<
      BulkGetResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoBadContentType | TransportError
    >;
    /** Lists all documents in a database. */
    readonly list: (
      db: string,
      options?: DocumentListParams,
    ) => Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Fetches specific documents by keys. */
    readonly fetch: (
      db: string,
      keys: readonly string[],
      options?: DocumentFetchParams,
    ) => Effect.Effect<DocumentFetchResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Lists all Mango indexes in a database. */
    readonly listIndexes: (
      db: string,
    ) => Effect.Effect<
      IndexListResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoInternalServerError | TransportError
    >;
    /** Creates a Mango index. */
    readonly createIndex: (
      db: string,
      index: CreateIndexRequest,
    ) => Effect.Effect<
      CreateIndexResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Deletes a Mango index. */
    readonly deleteIndex: (
      db: string,
      ddoc: string,
      name: string,
    ) => Effect.Effect<
      OkResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Executes a Mango query. */
    readonly find: (
      db: string,
      query: MangoQuery,
    ) => Effect.Effect<
      MangoResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Shows which index a Mango query would use without executing it. */
    readonly explain: (
      db: string,
      query: MangoQuery,
    ) => Effect.Effect<
      ExplainResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoInternalServerError | TransportError
    >;
    /** Uploads an attachment to a document. */
    readonly attachmentInsert: (
      db: string,
      docid: string,
      attname: string,
      data: unknown,
      options?: { readonly rev?: string },
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Downloads an attachment as a byte stream. */
    readonly attachmentGet: (
      db: string,
      docid: string,
      attname: string,
      options?: AttachmentGetParams,
    ) => Effect.Effect<
      Stream.Stream<Uint8Array, HttpClientError.HttpClientError>,
      CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Checks whether an attachment exists (HEAD request). */
    readonly attachmentHead: (
      db: string,
      docid: string,
      attname: string,
    ) => Effect.Effect<void, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Deletes an attachment from a document. */
    readonly attachmentDestroy: (
      db: string,
      docid: string,
      attname: string,
      rev: string,
      options?: AttachmentDestroyParams,
    ) => Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Streams all documents as decoded text. */
    readonly listStream: (
      db: string,
      options?: DocumentListParams,
    ) => Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Streams Mango query results as decoded text. */
    readonly findStream: (
      db: string,
      query: MangoQuery,
    ) => Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Retrieves partition metadata. */
    readonly partitionInfo: (
      db: string,
      partition: string,
    ) => Effect.Effect<PartitionInfoResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Lists all documents in a partition. */
    readonly partitionedList: (
      db: string,
      partition: string,
      options?: DocumentListParams,
    ) => Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Executes a Mango query within a partition. */
    readonly partitionedFind: (
      db: string,
      partition: string,
      query: MangoQuery,
    ) => Effect.Effect<
      MangoResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }
}
