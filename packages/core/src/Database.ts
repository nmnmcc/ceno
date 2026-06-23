import { Context, Effect, Schema, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";

import type {
  CenoAlreadyExists,
  CenoBadContentType,
  CenoBadRequest,
  CenoForbidden,
  CenoIllegalDatabaseName,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./Errors.ts";

/** Generic acknowledgement that an operation succeeded. */
export const OkResponse = Schema.Struct({ ok: Schema.Boolean });
export type OkResponse = typeof OkResponse.Type;

/** Acknowledgement that a database was created. */
export const DatabaseCreateResponse = Schema.Struct({
  ok: Schema.Boolean,
});
export type DatabaseCreateResponse = typeof DatabaseCreateResponse.Type;

/** Database metadata: document counts, sizes, and storage details. */
export const DatabaseGetResponse = Schema.Struct({
  cluster: Schema.Struct({
    n: Schema.Number,
    q: Schema.Number,
    r: Schema.Number,
    w: Schema.Number,
  }),
  compact_running: Schema.Boolean,
  db_name: Schema.String,
  disk_format_version: Schema.Number,
  doc_count: Schema.Number,
  doc_del_count: Schema.Number,
  instance_start_time: Schema.String,
  props: Schema.optional(Schema.Struct({ partitioned: Schema.optional(Schema.Boolean) })),
  purge_seq: Schema.String,
  sizes: Schema.Struct({
    active: Schema.Number,
    external: Schema.Number,
    file: Schema.Number,
  }),
  update_seq: Schema.String,
});
export type DatabaseGetResponse = typeof DatabaseGetResponse.Type;

/** A single entry in a database changes feed. */
export const DatabaseChangesResultItem = Schema.Struct({
  changes: Schema.Array(Schema.Struct({ rev: Schema.String })),
  id: Schema.String,
  seq: Schema.Unknown,
  deleted: Schema.optional(Schema.Boolean),
  // Present only when the feed is requested with include_docs=true.
  doc: Schema.optional(Schema.Unknown),
});
export type DatabaseChangesResultItem = typeof DatabaseChangesResultItem.Type;

/** Changes feed response. */
export const DatabaseChangesResponse = Schema.Struct({
  last_seq: Schema.Unknown,
  pending: Schema.Number,
  results: Schema.Array(DatabaseChangesResultItem),
});
export type DatabaseChangesResponse = typeof DatabaseChangesResponse.Type;

/** A single database-level update event. */
const DatabaseUpdatesResultItem = Schema.Struct({
  db_name: Schema.String,
  type: Schema.String,
  seq: Schema.Unknown,
});

/** Database updates response. */
export const DatabaseUpdatesResponse = Schema.Struct({
  results: Schema.Array(DatabaseUpdatesResultItem),
  last_seq: Schema.String,
});
export type DatabaseUpdatesResponse = typeof DatabaseUpdatesResponse.Type;

/** Replication history entry. */
const DatabaseReplicationHistoryItem = Schema.Struct({
  bulk_get_attempts: Schema.optional(Schema.Number),
  bulk_get_docs: Schema.optional(Schema.Number),
  doc_write_failures: Schema.Number,
  docs_read: Schema.Number,
  docs_written: Schema.Number,
  // CouchDB returns 0 (number) for initial sequences, opaque strings for actual
  // sequences. The _replicate docs say number; GET /{db} docs say string for the
  // same kind of value. Union covers both forms CouchDB actually produces.
  end_last_seq: Schema.Union([Schema.Number, Schema.String]),
  end_time: Schema.String,
  missing_checked: Schema.Number,
  missing_found: Schema.Number,
  recorded_seq: Schema.Union([Schema.Number, Schema.String]),
  session_id: Schema.String,
  start_last_seq: Schema.Union([Schema.Number, Schema.String]),
  start_time: Schema.String,
});

/** Replication response. */
export const DatabaseReplicateResponse = Schema.Struct({
  history: Schema.Array(DatabaseReplicationHistoryItem),
  ok: Schema.Boolean,
  replication_id_version: Schema.Number,
  session_id: Schema.String,
  source_last_seq: Schema.Union([Schema.Number, Schema.String]),
});
export type DatabaseReplicateResponse = typeof DatabaseReplicateResponse.Type;

/** Result of purging document revisions. */
export const PurgeResponse = Schema.Struct({
  purge_seq: Schema.NullOr(Schema.String),
  purged: Schema.Record(Schema.String, Schema.Array(Schema.String)),
});
export type PurgeResponse = typeof PurgeResponse.Type;

/** Options for creating a database. */
export interface DatabaseCreateParams {
  readonly n?: number;
  readonly partitioned?: boolean;
  readonly q?: number;
}

/**
 * Options for reading a database changes feed, as a Schema so the HttpApi query
 * encoder coerces each value: booleans → "true"/"false", numbers → decimal,
 * `since` (string or seq number) and `feed` pass through as strings.
 * See https://docs.couchdb.org/en/stable/api/database/changes.html
 */
export const DatabaseChangesParams = Schema.Struct({
  doc_ids: Schema.optional(Schema.UnknownFromJsonString),
  conflicts: Schema.optional(Schema.Boolean),
  descending: Schema.optional(Schema.Boolean),
  feed: Schema.optional(Schema.Literals(["normal", "longpoll", "continuous", "eventsource"])),
  filter: Schema.optional(Schema.String),
  heartbeat: Schema.optional(Schema.Number),
  include_docs: Schema.optional(Schema.Boolean),
  attachments: Schema.optional(Schema.Boolean),
  att_encoding_info: Schema.optional(Schema.Boolean),
  limit: Schema.optional(Schema.Number),
  since: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  style: Schema.optional(Schema.String),
  timeout: Schema.optional(Schema.Number),
  view: Schema.optional(Schema.String),
  seq_interval: Schema.optional(Schema.Number),
});
export type DatabaseChangesParams = typeof DatabaseChangesParams.Type;

/** Options for starting a replication between two databases. */
export interface DatabaseReplicateOptions {
  readonly cancel?: boolean;
  readonly continuous?: boolean;
  readonly create_target?: boolean;
  readonly create_target_params?: { readonly n?: number; readonly q?: number };
  readonly doc_ids?: readonly string[];
  readonly filter?: string;
  readonly selector?: object;
  readonly source_proxy?: string;
  readonly target_proxy?: string;
  readonly source?: string;
  readonly target?: string;
  readonly winning_revs_only?: boolean;
}

/** Options for subscribing to global database update events; a Schema so numeric/string params coerce on the wire. */
export const UpdatesParams = Schema.Struct({
  feed: Schema.optional(Schema.Literals(["normal", "longpoll", "continuous", "eventsource"])),
  timeout: Schema.optional(Schema.Number),
  heartbeat: Schema.optional(Schema.Number),
  since: Schema.optional(Schema.String),
});
export type UpdatesParams = typeof UpdatesParams.Type;

/**
 * Options for listing or looking up databases, as a Schema for wire coercion:
 * `descending`/`inclusive_end` → "true"/"false", `limit`/`skip` → decimal, and
 * the JSON key bounds (`startkey`/`endkey`) → JSON via `UnknownFromJsonString`.
 */
export const DatabaseListParams = Schema.Struct({
  descending: Schema.optional(Schema.Boolean),
  endkey: Schema.optional(Schema.UnknownFromJsonString),
  end_key: Schema.optional(Schema.UnknownFromJsonString),
  inclusive_end: Schema.optional(Schema.Boolean),
  limit: Schema.optional(Schema.Number),
  skip: Schema.optional(Schema.Number),
  startkey: Schema.optional(Schema.UnknownFromJsonString),
  start_key: Schema.optional(Schema.UnknownFromJsonString),
});
export type DatabaseListParams = typeof DatabaseListParams.Type;

/** Access control list used in `_security`. */
// CouchDB docs show names/roles as required arrays. CouchDB 3.x omits them on
// databases with no explicit security (`admins: {}`). withDecodingDefaultKey
// keeps the Type required (matching docs) and defaults to [] when absent.
const SecurityAcl = Schema.Struct({
  names: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  roles: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
});

/** A database's admins and members access lists. */
export const SecurityObject = Schema.Struct({
  admins: Schema.optional(SecurityAcl),
  members: Schema.optional(SecurityAcl),
});
export type SecurityObject = typeof SecurityObject.Type;

/** Metadata for a single database in a multi-database lookup. */
const DbsInfoItem = Schema.Struct({
  key: Schema.String,
  info: Schema.NullOr(Schema.Unknown),
  error: Schema.optional(Schema.String),
});

/** Metadata for multiple databases requested together. */
export const DbsInfoResponse = Schema.Array(DbsInfoItem);
export type DbsInfoResponse = typeof DbsInfoResponse.Type;

/** Database management operations: create, delete, compact, replicate, changes, security, and maintenance. */
export class Database extends Context.Service<Database, Database.Database>()("@ceno/core/Database") {}

export namespace Database {
  /** Service shape for database management operations. */
  export interface Database {
    /** Creates a new database. */
    create(
      name: string,
      options?: DatabaseCreateParams,
    ): Effect.Effect<
      DatabaseCreateResponse,
      CenoIllegalDatabaseName | CenoUnauthorized | CenoForbidden | CenoAlreadyExists | TransportError
    >;

    /** Checks whether a database exists. */
    exists(name: string): Effect.Effect<boolean, CenoUnauthorized | CenoForbidden | TransportError>;

    /** Deletes a database. */
    destroy(
      name: string,
    ): Effect.Effect<
      OkResponse,
      CenoIllegalDatabaseName | CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError
    >;

    /** Lists all database names. */
    list(
      options?: DatabaseListParams,
    ): Effect.Effect<readonly string[], CenoUnauthorized | CenoForbidden | TransportError>;

    /** Retrieves metadata for a single database. */
    info(
      name: string,
    ): Effect.Effect<DatabaseGetResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;

    /** Retrieves metadata for multiple databases in a single request. */
    dbsInfo(
      options?: DatabaseListParams,
    ): Effect.Effect<DbsInfoResponse, CenoUnauthorized | CenoForbidden | TransportError>;

    /** Retrieves metadata for specific databases given by name. */
    dbsInfoPost(
      keys: readonly string[],
    ): Effect.Effect<DbsInfoResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Triggers compaction on a database or design document. */
    compact(
      name: string,
      ddoc?: string,
    ): Effect.Effect<
      OkResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoBadContentType | TransportError
    >;

    /** Removes unused view index files. */
    viewCleanup(
      name: string,
    ): Effect.Effect<
      OkResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoBadContentType | TransportError
    >;

    /** Retrieves the database security object. */
    getSecurity(name: string): Effect.Effect<SecurityObject, CenoUnauthorized | CenoForbidden | TransportError>;

    /** Sets the database security object. */
    setSecurity(
      name: string,
      security: SecurityObject,
    ): Effect.Effect<OkResponse, CenoUnauthorized | CenoForbidden | TransportError>;

    /** Retrieves the current revision limit for the database. */
    getRevsLimit(name: string): Effect.Effect<number, CenoUnauthorized | CenoForbidden | TransportError>;

    /** Sets the revision limit for the database. */
    setRevsLimit(
      name: string,
      limit: number,
    ): Effect.Effect<OkResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Finds document revisions not present in the database. */
    missingRevs(
      name: string,
      body: unknown,
    ): Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Returns the subset of revisions that do not correspond to revisions stored in the database. */
    revsDiff(
      name: string,
      body: unknown,
    ): Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Permanently removes references to specified document revisions. */
    purge(
      name: string,
      body: unknown,
    ): Effect.Effect<
      PurgeResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoBadContentType | CenoInternalServerError | TransportError
    >;

    /** Retrieves the current purged infos limit. */
    getPurgedInfosLimit(name: string): Effect.Effect<number, CenoUnauthorized | CenoForbidden | TransportError>;

    /** Sets the purged infos limit. */
    setPurgedInfosLimit(
      name: string,
      limit: number,
    ): Effect.Effect<OkResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Starts a replication between two databases. */
    replicate(
      options: DatabaseReplicateOptions,
    ): Effect.Effect<
      DatabaseReplicateResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;

    /** Retrieves the changes feed for a database. */
    changes(
      name: string,
      options?: DatabaseChangesParams,
    ): Effect.Effect<DatabaseChangesResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Retrieves the changes feed, filtered by an explicit set of document IDs or a selector in the request body. */
    changesPost(
      name: string,
      body: unknown,
    ): Effect.Effect<DatabaseChangesResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;

    /** Streams parsed change events from the continuous changes feed. */
    changesStream(
      name: string,
      options?: DatabaseChangesParams,
    ): Effect.Effect<
      Stream.Stream<DatabaseChangesResultItem, HttpClientError.HttpClientError | Schema.SchemaError>,
      TransportError
    >;

    /** Retrieves global database update events. */
    updates(
      options?: UpdatesParams,
    ): Effect.Effect<DatabaseUpdatesResponse, CenoUnauthorized | CenoForbidden | TransportError>;
  }
}
