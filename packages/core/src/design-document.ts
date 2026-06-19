import { Context, Schema, type Effect, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type {
  CenoBadRequest,
  CenoConflict,
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
    /** Queries a view. */
    readonly view: (
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<DesignDocumentViewResponse, CenoBadRequest | CenoUnauthorized | CenoNotFound | TransportError>;
    /** Streams view results as raw bytes. */
    readonly viewStream: (
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<Stream.Stream<Uint8Array, HttpClientError.HttpClientError>, TransportError>;
    /** Queries a full-text search index. */
    readonly search: (
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ) => Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Streams search results as raw bytes. */
    readonly searchStream: (
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ) => Effect.Effect<Stream.Stream<Uint8Array, HttpClientError.HttpClientError>, TransportError>;
    /** Renders a document through a show function. */
    readonly show: (
      db: string,
      ddoc: string,
      func: string,
      docid: string,
    ) => Effect.Effect<unknown, CenoNotFound | TransportError>;
    /** Applies an update handler to a document. */
    readonly updateHandler: (
      db: string,
      ddoc: string,
      func: string,
      docid: string,
      body: unknown,
    ) => Effect.Effect<unknown, CenoNotFound | CenoConflict | CenoInternalServerError | TransportError>;
    /** Applies a list function to a view. */
    readonly viewWithList: (
      db: string,
      ddoc: string,
      list: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<unknown, CenoBadRequest | CenoNotFound | CenoInternalServerError | TransportError>;
    /** Queries a view within a partition. */
    readonly partitionedView: (
      db: string,
      partition: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ) => Effect.Effect<DesignDocumentViewResponse, CenoBadRequest | CenoUnauthorized | CenoNotFound | TransportError>;
    /** Queries a search index within a partition. */
    readonly partitionedSearch: (
      db: string,
      partition: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ) => Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }
}
