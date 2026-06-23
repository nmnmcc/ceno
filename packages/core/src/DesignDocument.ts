import { Context, Schema, type Effect, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type { DocumentInsertResponse } from "./Document.ts";
import type {
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./Errors.ts";

/**
 * CouchDB's built-in reduce functions. Use one of these as a view's `reduce`
 * value instead of hand-writing a JavaScript reducer — they run natively in the
 * query server and are far faster than an equivalent custom function.
 *
 * @see https://docs.couchdb.org/en/stable/ddocs/ddocs.html
 */
export const ReduceFunction = {
  /** Number of rows sharing each key. */
  count: "_count",
  /** Sum of the emitted numeric values (element-wise for numeric arrays). */
  sum: "_sum",
  /** Per-key `{ sum, count, min, max, sumsqr }`. */
  stats: "_stats",
  /** Approximate distinct-key count using a HyperLogLog variant. */
  approxCountDistinct: "_approx_count_distinct",
} as const;

// Query servers inject globals (emit, sum, log, …) into design functions. Rather than declaring
// those as ambient globals — which pollutes the user's whole project — they are exposed on the
// function's `this`, so each function gets type-safe access with no global declarations. Turning
// `this.x` into whatever a given backend needs is the backend's job (the CouchDB backend rewrites
// it to the bare `x` and serializes to a string; see @ceno/couchdb's internal/designBody).
/** Globals available to every design function. */
type QueryServerContext = { log(message: unknown): void };
/** The `this` of a map function: emits index rows. */
type MapContext = QueryServerContext & { emit(key: unknown, value?: unknown): void };
/** The `this` of a reduce function: includes CouchDB's built-in `sum`. */
type ReduceContext = QueryServerContext & { sum(values: ReadonlyArray<number>): number };

// Each function is typed against the stored document type `T`; every field also accepts a
// plain source string, so existing string-based code keeps working.
/** A view map function: emits index rows for a document via `this.emit`. */
type MapFunction<T> = (this: MapContext, doc: T) => void;
/** A custom reduce function (built-in names live in {@link ReduceFunction}). */
type ReduceImpl = (
  this: ReduceContext,
  keys: ReadonlyArray<readonly [unknown, unknown]> | null,
  values: ReadonlyArray<unknown>,
  rereduce: boolean,
) => unknown;
/** A changes-feed filter: keep a document when it returns true. */
type FilterFunction<T> = (this: QueryServerContext, doc: T, request: unknown) => boolean;
/** An update handler: a server-side transform invoked through `_update`. */
type UpdateFunction<T> = (this: QueryServerContext, doc: T | null, request: unknown) => unknown;
/** A validation function: throw `{ forbidden }` / `{ unauthorized }` to reject a write. */
type ValidateFunction<T> = (
  this: QueryServerContext,
  newDoc: T,
  oldDoc: T | null,
  userContext: unknown,
  security: unknown,
) => void;

/**
 * A single MapReduce view: a `map` paired with an optional `reduce`. Generic over
 * the stored document type `T` so `map`/`reduce` get a typed `doc`. Each field may
 * be a real function (serialized on write) or its source string; `reduce` also
 * accepts a built-in name from {@link ReduceFunction}.
 */
export interface DesignDocumentView<T = Record<string, unknown>> {
  readonly map: MapFunction<T> | string;
  readonly reduce?: ReduceImpl | string;
}

/**
 * The writable body of a design document — what {@link DesignDocument.put} writes
 * to `_design/<name>`. Generic over the stored document type `T`, so every
 * function field (`views`, `updates`, `filters`, `validate_doc_update`) gets a
 * typed `doc` parameter. Each function may be written inline as a real,
 * editor-checked function or as a source string; `put` serializes functions for
 * you. Every section is optional; pass `_rev` when overwriting an existing one.
 *
 * @see https://docs.couchdb.org/en/stable/ddocs/ddocs.html
 */
export interface DesignDocumentBody<T = Record<string, unknown>> {
  readonly _id?: string;
  readonly _rev?: string;
  /** Query-server language the functions are written in; CouchDB defaults to `"javascript"`. */
  readonly language?: string;
  /** Index options; set `partitioned` to match a partitioned database. */
  readonly options?: { readonly partitioned?: boolean };
  /** Named MapReduce views — the primary query tool. */
  readonly views?: Readonly<Record<string, DesignDocumentView<T>>>;
  /** Named update-handler functions, invoked through `_update`. */
  readonly updates?: Readonly<Record<string, UpdateFunction<T> | string>>;
  /** Named filter functions for the changes feed. */
  readonly filters?: Readonly<Record<string, FilterFunction<T> | string>>;
  /** Single validation function run on every write to guard the database. */
  readonly validate_doc_update?: ValidateFunction<T> | string;
}

/** Row from a view query. */
const DesignDocumentViewResponseRow = Schema.Struct({
  // id is absent on reduced/grouped rows ({key, value}) and on error rows ({key, error}).
  id: Schema.optional(Schema.String),
  key: Schema.Unknown,
  // value is absent on error rows (e.g. a missing key passed via `keys`).
  value: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.String),
  doc: Schema.optional(Schema.Unknown),
});

/** View query response. */
export const DesignDocumentViewResponse = Schema.Struct({
  // offset and total_rows are absent for reduce/grouped queries and when sorted=false.
  offset: Schema.optional(Schema.Number),
  rows: Schema.Array(DesignDocumentViewResponseRow),
  total_rows: Schema.optional(Schema.Number),
  update_seq: Schema.optional(Schema.Unknown),
});
export type DesignDocumentViewResponse = typeof DesignDocumentViewResponse.Type;

/** Row from a search query. */
const DesignDocumentSearchResponseRow = Schema.Struct({
  id: Schema.String,
  // order and fields appear only when the index stores fields / on sorted results; a search row carries no `key`.
  // Elements may be numbers (relevance score) or strings (when sorted by a string field).
  order: Schema.optional(Schema.Array(Schema.Unknown)),
  fields: Schema.optional(Schema.Unknown),
  doc: Schema.optional(Schema.Unknown),
});

/** Search query response. */
export const DesignDocumentSearchResponse = Schema.Struct({
  rows: Schema.Array(DesignDocumentSearchResponseRow),
  total_rows: Schema.Number,
  // bookmark is absent on grouped searches (group_field), which return groups instead of a paginated list.
  bookmark: Schema.optional(Schema.String),
  // groups replaces rows/bookmark when group_field is used.
  groups: Schema.optional(Schema.Unknown),
  counts: Schema.optional(Schema.Unknown),
  ranges: Schema.optional(Schema.Unknown),
  highlights: Schema.optional(Schema.Unknown),
});
export type DesignDocumentSearchResponse = typeof DesignDocumentSearchResponse.Type;

/** Index metadata for a design document's views. */
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

/**
 * Params for a view query, as a Schema so the HttpApi query encoder coerces each
 * value to its wire string: booleans (`group`/`reduce`/`descending`/…) →
 * "true"/"false", numbers → decimal, JSON key params (`key`/`keys`/`startkey`/
 * `endkey`) → JSON via `UnknownFromJsonString`. `stale` and `update` are strings
 * ("ok"/"update_after", "true"/"false"/"lazy") per the CouchDB spec, not booleans.
 * See https://docs.couchdb.org/en/stable/api/ddoc/views.html
 */
export const DesignDocumentViewParams = Schema.Struct({
  conflicts: Schema.optional(Schema.Boolean),
  descending: Schema.optional(Schema.Boolean),
  endkey: Schema.optional(Schema.UnknownFromJsonString),
  end_key: Schema.optional(Schema.UnknownFromJsonString),
  endkey_docid: Schema.optional(Schema.String),
  end_key_doc_id: Schema.optional(Schema.String),
  group: Schema.optional(Schema.Boolean),
  group_level: Schema.optional(Schema.Number),
  include_docs: Schema.optional(Schema.Boolean),
  attachments: Schema.optional(Schema.Boolean),
  att_encoding_info: Schema.optional(Schema.Boolean),
  inclusive_end: Schema.optional(Schema.Boolean),
  key: Schema.optional(Schema.UnknownFromJsonString),
  keys: Schema.optional(Schema.UnknownFromJsonString),
  limit: Schema.optional(Schema.Number),
  reduce: Schema.optional(Schema.Boolean),
  skip: Schema.optional(Schema.Number),
  sorted: Schema.optional(Schema.Boolean),
  stable: Schema.optional(Schema.Boolean),
  stale: Schema.optional(Schema.String),
  startkey: Schema.optional(Schema.UnknownFromJsonString),
  start_key: Schema.optional(Schema.UnknownFromJsonString),
  startkey_docid: Schema.optional(Schema.String),
  start_key_doc_id: Schema.optional(Schema.String),
  update: Schema.optional(Schema.String),
  update_seq: Schema.optional(Schema.Boolean),
});
export type DesignDocumentViewParams = typeof DesignDocumentViewParams.Type;

/**
 * Params for a search query, as a Schema for wire coercion. JSON-valued params
 * (`counts`/`drilldown`/`group_sort`/`highlight_fields`/`include_fields`/
 * `ranges`/`sort`) encode via `UnknownFromJsonString`; `stale` is a string
 * ("ok"), not a boolean. See https://docs.couchdb.org/en/stable/api/ddoc/search.html
 */
export const DesignDocumentSearchParams = Schema.Struct({
  bookmark: Schema.optional(Schema.String),
  counts: Schema.optional(Schema.UnknownFromJsonString),
  drilldown: Schema.optional(Schema.UnknownFromJsonString),
  group_field: Schema.optional(Schema.String),
  group_limit: Schema.optional(Schema.Number),
  group_sort: Schema.optional(Schema.UnknownFromJsonString),
  highlight_fields: Schema.optional(Schema.UnknownFromJsonString),
  highlight_pre_tag: Schema.optional(Schema.String),
  highlight_post_tag: Schema.optional(Schema.String),
  highlight_number: Schema.optional(Schema.Number),
  highlight_size: Schema.optional(Schema.Number),
  include_docs: Schema.optional(Schema.Boolean),
  include_fields: Schema.optional(Schema.UnknownFromJsonString),
  limit: Schema.optional(Schema.Number),
  q: Schema.optional(Schema.String),
  query: Schema.optional(Schema.String),
  ranges: Schema.optional(Schema.UnknownFromJsonString),
  sort: Schema.optional(Schema.UnknownFromJsonString),
  stale: Schema.optional(Schema.String),
});
export type DesignDocumentSearchParams = typeof DesignDocumentSearchParams.Type;

/** Design document operations: views, search, and show/update/list functions. */
export class DesignDocument extends Context.Service<DesignDocument, DesignDocument.DesignDocument>()(
  "@ceno/core/DesignDocument",
) {}

export namespace DesignDocument {
  /** Design document operations narrowed to a single database, created by calling `in` on the {@link DesignDocument} service. */
  export type DatabaseDesignDocument = {
    readonly [K in Exclude<keyof DesignDocument, "in" | "partitioned" | "put">]: DesignDocument[K] extends (
      db: string,
      ...rest: infer R
    ) => infer Ret
      ? (...args: R) => Ret
      : DesignDocument[K];
  } & {
    /** Creates a partition-scoped view of design document operations for a specific partition within this database. */
    partitioned(partition: string): DatabasePartitionedDesignDocument;
    /** Creates or replaces a design document in this database, serializing any inline functions to source strings. */
    put<T = Record<string, unknown>>(
      ddoc: string,
      body: DesignDocumentBody<T>,
    ): Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
  };

  /** Design document operations narrowed to a single partition, created by calling `partitioned` on the {@link DesignDocument} service. Each method still requires a `db` parameter. */
  export interface PartitionedDesignDocument {
    /** Queries a view within this partition of a database. */
    view(
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ): Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Queries a search index within this partition of a database, when the backend provides one. */
    search(
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ): Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }

  /** Design document operations narrowed to a single partition within a single database, created by calling `partitioned` on a {@link DatabaseDesignDocument}. */
  export type DatabasePartitionedDesignDocument = {
    readonly [K in keyof PartitionedDesignDocument]: PartitionedDesignDocument[K] extends (
      db: string,
      ...rest: infer R
    ) => infer Ret
      ? (...args: R) => Ret
      : PartitionedDesignDocument[K];
  };

  /** Service shape for design document operations. */
  export interface DesignDocument {
    /** Creates a database-scoped view of these operations, removing the `db` parameter from every method. */
    in(db: string): DatabaseDesignDocument;
    /** Creates a partition-scoped view, binding the partition name. Each method still requires a `db` parameter. */
    partitioned(partition: string): PartitionedDesignDocument;
    /**
     * Creates or replaces a design document. Functions in `body` (map, reduce,
     * update, filter, validator) may be written inline and are serialized to
     * source strings automatically — no manual encoding. Generic over the stored
     * document type `T`, so `doc` parameters are typed: `put<Product>(db, name, …)`.
     */
    put<T = Record<string, unknown>>(
      db: string,
      ddoc: string,
      body: DesignDocumentBody<T>,
    ): Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Retrieves view index metadata for a design document. */
    info(
      db: string,
      ddoc: string,
    ): Effect.Effect<DesignDocumentInfoResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Queries a view. */
    view(
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ): Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Queries a view, passing an explicit set of keys in the request body. */
    viewPost(
      db: string,
      ddoc: string,
      viewname: string,
      body: unknown,
    ): Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Streams view results as decoded text. */
    viewStream(
      db: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Queries a full-text search index, when the backend provides one. */
    search(
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ): Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Streams full-text search results as decoded text, when the backend provides one. */
    searchStream(
      db: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ): Effect.Effect<Stream.Stream<string, HttpClientError.HttpClientError>, TransportError>;
    /** Renders a document through a show function. */
    show(
      db: string,
      ddoc: string,
      func: string,
      docid: string,
    ): Effect.Effect<
      unknown,
      CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Applies an update handler to an existing document. */
    updateHandler(
      db: string,
      ddoc: string,
      func: string,
      docid: string,
      body: unknown,
    ): Effect.Effect<
      unknown,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Applies a list function to a view. */
    viewWithList(
      db: string,
      ddoc: string,
      list: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ): Effect.Effect<
      unknown,
      CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Queries a view within a single partition. */
    partitionedView(
      db: string,
      partition: string,
      ddoc: string,
      viewname: string,
      options?: DesignDocumentViewParams,
    ): Effect.Effect<
      DesignDocumentViewResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;
    /** Queries a search index within a single partition, when the backend provides one. */
    partitionedSearch(
      db: string,
      partition: string,
      ddoc: string,
      index: string,
      options?: DesignDocumentSearchParams,
    ): Effect.Effect<
      DesignDocumentSearchResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
  }
}
