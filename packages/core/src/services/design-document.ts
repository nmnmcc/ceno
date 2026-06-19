import { Context, Schema, type Effect, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type {
  CenoBadRequest,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./errors";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Row from a view query. */
const DesignDocumentViewResponseRow = Schema.Struct({
  id: Schema.String,
  key: Schema.Unknown,
  value: Schema.Unknown,
  doc: Schema.optional(Schema.Unknown),
});

/** View query response. */
export const DesignDocumentViewResponse = Schema.Struct({
  offset: Schema.Number,
  rows: Schema.Array(DesignDocumentViewResponseRow),
  total_rows: Schema.Number,
  update_seq: Schema.optional(Schema.Unknown),
});
export type DesignDocumentViewResponse = typeof DesignDocumentViewResponse.Type;

/** Row from a search query. */
const DesignDocumentSearchResponseRow = Schema.Struct({
  id: Schema.String,
  order: Schema.Array(Schema.Number),
  fields: Schema.Unknown,
  key: Schema.String,
  doc: Schema.optional(Schema.Unknown),
});

/** Search query response. */
export const DesignDocumentSearchResponse = Schema.Struct({
  rows: Schema.Array(DesignDocumentSearchResponseRow),
  total_rows: Schema.Number,
  bookmark: Schema.String,
  counts: Schema.optional(Schema.Unknown),
  ranges: Schema.optional(Schema.Unknown),
  highlights: Schema.optional(Schema.Unknown),
});
export type DesignDocumentSearchResponse = typeof DesignDocumentSearchResponse.Type;

/** Design document index metadata from `GET /{db}/_design/{ddoc}/_info`. */
export const DesignDocumentInfoResponse = Schema.Struct({
  name: Schema.String,
  view_index: Schema.Struct({
    compact_running: Schema.Boolean,
    language: Schema.String,
    purge_seq: Schema.Union([Schema.Number, Schema.String]),
    signature: Schema.String,
    sizes: Schema.Struct({
      active: Schema.Number,
      file: Schema.Number,
      external: Schema.Number,
    }),
    update_seq: Schema.Unknown,
    updater_running: Schema.Boolean,
    waiting_clients: Schema.Number,
    waiting_commit: Schema.Boolean,
  }),
});
export type DesignDocumentInfoResponse = typeof DesignDocumentInfoResponse.Type;

// ---------------------------------------------------------------------------
// Parameter Types
// ---------------------------------------------------------------------------

/** Params for a view query. */
export interface DesignDocumentViewParams {
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
export interface DesignDocumentSearchParams {
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** CouchDB design document operations (views, search, show/update/list functions). */
export class DesignDocument extends Context.Service<DesignDocument, DesignDocument.DesignDocument>()(
  "@ceno/core/DesignDocument",
) {}

export namespace DesignDocument {
  /** Service shape for design document operations. */
  export interface DesignDocument {
    /** Retrieves view index metadata for a design document. */
    readonly info: (
      db: string,
      ddoc: string,
    ) => Effect.Effect<DesignDocumentInfoResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Queries a view via GET. */
    readonly view: (
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Queries a view via POST (supports keys in body). */
    readonly viewPost: (
      db: string,
      ddoc: string,
      viewname: string,
      body: unknown,
    ) => Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Streams view results as decoded text. */
    readonly viewStream: (
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Queries a full-text search index (requires Clouseau plugin). */
    readonly search: (
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ) => Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Streams search results as decoded text (requires Clouseau plugin). */
    readonly searchStream: (
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ) => Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Renders a document through a show function (deprecated in CouchDB 3.0). */
    readonly show: (
      db: string,
      ddoc: string,
      func: string,
      docid: string,
    ) => Effect.Effect<
      unknown,
      CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Applies an update handler to an existing document (deprecated in CouchDB 3.0). */
    readonly updateHandler: (
      db: string,
      ddoc: string,
      func: string,
      docid: string,
      body: unknown,
    ) => Effect.Effect<
      unknown,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Applies a list function to a view (deprecated in CouchDB 3.0). */
    readonly viewWithList: (
      db: string,
      ddoc: string,
      list: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<
      unknown,
      CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Queries a view within a partition. */
    readonly partitionedView: (
      db: string,
      partition: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Queries a search index within a partition (requires Clouseau plugin). */
    readonly partitionedSearch: (
      db: string,
      partition: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ) => Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }
}
