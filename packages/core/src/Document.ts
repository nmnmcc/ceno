import { Context, Schema, type Effect, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type { OkResponse } from "./Database.ts";
import type {
  CenoBadContentType,
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./Errors.ts";

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

/** Per-document result from a bulk write. */
export const DocumentBulkResponse = Schema.Struct({
  id: Schema.String,
  ok: Schema.optional(Schema.Boolean),
  rev: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  reason: Schema.optional(Schema.String),
});
export type DocumentBulkResponse = typeof DocumentBulkResponse.Type;

/** A single listed document, optionally including its body. */
export const DocumentResponseRow = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  value: Schema.Struct({ rev: Schema.String }),
  error: Schema.optional(Schema.String),
  doc: Schema.optional(Schema.Unknown),
});
export type DocumentResponseRow = typeof DocumentResponseRow.Type;

/** A page of listed documents; `offset` and `total_rows` may be absent for some listings. */
export const DocumentListResponse = Schema.Struct({
  offset: Schema.NullOr(Schema.Number),
  rows: Schema.Array(DocumentResponseRow),
  total_rows: Schema.NullOr(Schema.Number),
  update_seq: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
});
export type DocumentListResponse = typeof DocumentListResponse.Type;

/** A key that could not be resolved during a bulk fetch. */
const DocumentLookupFailure = Schema.Struct({
  key: Schema.String,
  error: Schema.String,
});

/** Result of fetching documents by an explicit set of keys. */
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

/** Result of retrieving many documents by ID in a single request. */
export const BulkGetResponse = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      docs: Schema.Array(BulkGetResultDoc),
    }),
  ),
});
export type BulkGetResponse = typeof BulkGetResponse.Type;

/** A single defined query index. */
const IndexDef = Schema.Struct({
  ddoc: Schema.NullOr(Schema.String),
  name: Schema.String,
  type: Schema.String,
  def: Schema.Unknown,
  partitioned: Schema.optional(Schema.Boolean),
});

/** The set of query indexes defined on a database. */
export const IndexListResponse = Schema.Struct({
  total_rows: Schema.Number,
  indexes: Schema.Array(IndexDef),
});
export type IndexListResponse = typeof IndexListResponse.Type;

/** The query plan describing how a query would be executed. */
export const ExplainResponse = Schema.Unknown;
export type ExplainResponse = typeof ExplainResponse.Type;

/** Options for inserting a document with a server-assigned ID. */
export interface DocumentInsertParams {
  readonly batch?: "ok";
}

/** Options for creating or updating a document at a specific ID. */
export interface DocumentPutParams {
  readonly rev?: string;
  readonly batch?: "ok";
  readonly new_edits?: boolean;
}

/** Options for retrieving a document. */
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

/** Options for listing documents. */
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

/** Options for fetching documents by an explicit set of keys. */
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

/** Request body wrapping the documents to write in bulk. */
export interface BulkModifyDocsWrapper {
  readonly docs: readonly unknown[];
}

/** Request body wrapping the keys to fetch in bulk. */
export interface BulkFetchDocsWrapper {
  readonly keys: readonly string[];
}

/** Document that may have `_id` and `_rev`. */
export interface MaybeDocument {
  readonly _id?: string;
  readonly _rev?: string;
}

/** A single document reference in a bulk get request. */
export interface BulkGetDoc {
  readonly id: string;
  readonly rev?: string;
  readonly atts_since?: readonly string[];
}

/** Options for deleting a document. */
export interface DocumentDestroyParams {
  readonly batch?: "ok";
}

/** Options for downloading an attachment. */
export interface AttachmentGetParams {
  readonly rev?: string;
}

/** Options for deleting an attachment. */
export interface AttachmentDestroyParams {
  readonly batch?: "ok";
}

/** Document operations: CRUD, bulk reads and writes, queries, and attachments. */
export class Document extends Context.Service<Document, Document.Document>()("@ceno/core/Document") {}

export namespace Document {
  /** Document operations narrowed to a single database, created by calling `in` on the {@link Document} service. */
  export type DatabaseDocument = {
    readonly [K in Exclude<keyof Document, "in">]: Document[K] extends (db: string, ...rest: infer R) => infer Ret
      ? (...args: R) => Ret
      : Document[K];
  } & {
    /** Creates a partition-scoped view of document operations for a specific partition within this database. */
    partitioned(partition: string): DatabasePartitionedDocument;
  };

  /** Document operations narrowed to a single partition, created by calling `partitioned` on the {@link Document} service. Each method still requires a `db` parameter. */
  export interface PartitionedDocument {
    /** Retrieves metadata for this partition within a database. */
    info(
      db: string,
    ): Effect.Effect<PartitionInfoResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Lists all documents in this partition within a database. */
    list(
      db: string,
      options?: DocumentListParams,
    ): Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Executes a Mango query within this partition of a database. */
    find(
      db: string,
      query: MangoQuery,
    ): Effect.Effect<
      MangoResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }

  /** Document operations narrowed to a single partition within a single database, created by calling `partitioned` on a {@link DatabaseDocument}. */
  export type DatabasePartitionedDocument = {
    readonly [K in keyof PartitionedDocument]: PartitionedDocument[K] extends (db: string, ...rest: infer R) => infer Ret
      ? (...args: R) => Ret
      : PartitionedDocument[K];
  };

  /** Service shape for document-level operations. */
  export interface Document {
    /** Creates a database-scoped view of these operations, removing the `db` parameter from every method. */
    in(db: string): DatabaseDocument;
    /** Creates a partition-scoped view, binding the partition name. Each method still requires a `db` parameter. */
    partitioned(partition: string): PartitionedDocument;
    /** Inserts a document with server-generated or body-provided ID. */
    insert(
      db: string,
      body: unknown,
      options?: DocumentInsertParams,
    ): Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Creates or updates a document at a specific ID. */
    put(
      db: string,
      docid: string,
      body: unknown,
      options?: DocumentPutParams,
    ): Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Retrieves a document by ID. */
    get(
      db: string,
      docid: string,
      options?: DocumentGetParams,
    ): Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Checks whether a document exists. */
    exists(db: string, docid: string): Effect.Effect<boolean, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Deletes a document by ID and revision. */
    destroy(
      db: string,
      docid: string,
      rev: string,
      options?: DocumentDestroyParams,
    ): Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Inserts or updates multiple documents in bulk. */
    bulk(
      db: string,
      docs: readonly unknown[],
    ): Effect.Effect<
      readonly DocumentBulkResponse[],
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Retrieves multiple documents by ID and optional revision in a single request. */
    bulkGet(
      db: string,
      docs: readonly BulkGetDoc[],
    ): Effect.Effect<
      BulkGetResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoBadContentType | TransportError
    >;
    /** Lists all documents in a database. */
    list(
      db: string,
      options?: DocumentListParams,
    ): Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Streams all documents as decoded text. */
    listStream(
      db: string,
      options?: DocumentListParams,
    ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Fetches specific documents by keys. */
    fetch(
      db: string,
      keys: readonly string[],
      options?: DocumentFetchParams,
    ): Effect.Effect<DocumentFetchResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Lists all Mango indexes in a database. */
    listIndexes(
      db: string,
    ): Effect.Effect<
      IndexListResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoInternalServerError | TransportError
    >;
    /** Creates a Mango index. */
    createIndex(
      db: string,
      index: CreateIndexRequest,
    ): Effect.Effect<
      CreateIndexResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Deletes a Mango index. */
    deleteIndex(
      db: string,
      ddoc: string,
      name: string,
    ): Effect.Effect<
      OkResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Executes a Mango query. */
    find(
      db: string,
      query: MangoQuery,
    ): Effect.Effect<
      MangoResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Streams Mango query results as decoded text. */
    findStream(
      db: string,
      query: MangoQuery,
    ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Shows which index a Mango query would use without executing it. */
    explain(
      db: string,
      query: MangoQuery,
    ): Effect.Effect<
      ExplainResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoInternalServerError | TransportError
    >;
    /** Uploads an attachment to a document. */
    attachmentInsert(
      db: string,
      docid: string,
      attname: string,
      data: unknown,
      options?: { readonly rev?: string },
    ): Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Downloads an attachment as a byte stream. */
    attachmentGet(
      db: string,
      docid: string,
      attname: string,
      options?: AttachmentGetParams,
    ): Effect.Effect<
      Stream.Stream<Uint8Array, HttpClientError.HttpClientError>,
      CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Checks whether an attachment exists. */
    attachmentExists(
      db: string,
      docid: string,
      attname: string,
    ): Effect.Effect<boolean, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Deletes an attachment from a document. */
    attachmentDestroy(
      db: string,
      docid: string,
      attname: string,
      rev: string,
      options?: AttachmentDestroyParams,
    ): Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Retrieves metadata for a single partition of a partitioned database. */
    partitionInfo(
      db: string,
      partition: string,
    ): Effect.Effect<PartitionInfoResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Lists all documents in a single partition. */
    partitionedList(
      db: string,
      partition: string,
      options?: DocumentListParams,
    ): Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Executes a Mango query within a single partition. */
    partitionedFind(
      db: string,
      partition: string,
      query: MangoQuery,
    ): Effect.Effect<
      MangoResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }
}
