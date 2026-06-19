import { Context, Schema, type Effect, type Stream } from "effect";
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
} from "./errors";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Generic `{"ok": true}` response. */
export const OkResponse = Schema.Struct({ ok: Schema.Boolean });
export type OkResponse = typeof OkResponse.Type;

/** Response from `PUT /{db}` (create database). */
export const DatabaseCreateResponse = Schema.Struct({
  ok: Schema.Boolean,
});
export type DatabaseCreateResponse = typeof DatabaseCreateResponse.Type;

/** Database metadata from `GET /{db}`. */
export const DatabaseGetResponse = Schema.Struct({
  compact_running: Schema.Boolean,
  db_name: Schema.String,
  disk_format_version: Schema.Number,
  data_size: Schema.Number,
  disk_size: Schema.Number,
  doc_count: Schema.Number,
  doc_del_count: Schema.Number,
  instance_start_time: Schema.String,
  purge_seq: Schema.Union([Schema.Number, Schema.String]),
  sizes: Schema.Struct({
    active: Schema.Number,
    external: Schema.Number,
    file: Schema.Number,
  }),
  update_seq: Schema.Union([Schema.Number, Schema.String]),
});
export type DatabaseGetResponse = typeof DatabaseGetResponse.Type;

/** Single entry from `GET /{db}/_changes`. */
export const DatabaseChangesResultItem = Schema.Struct({
  changes: Schema.Array(Schema.Struct({ rev: Schema.String })),
  id: Schema.String,
  seq: Schema.Unknown,
  deleted: Schema.optional(Schema.Boolean),
});
export type DatabaseChangesResultItem = typeof DatabaseChangesResultItem.Type;

/** Changes feed response. */
export const DatabaseChangesResponse = Schema.Struct({
  last_seq: Schema.Unknown,
  pending: Schema.Number,
  results: Schema.Array(DatabaseChangesResultItem),
});
export type DatabaseChangesResponse = typeof DatabaseChangesResponse.Type;

/** Single event from `GET /_db_updates`. */
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
  doc_write_failures: Schema.Number,
  docs_read: Schema.Number,
  docs_written: Schema.Number,
  end_last_seq: Schema.Number,
  end_time: Schema.String,
  missing_checked: Schema.Number,
  missing_found: Schema.Number,
  recorded_seq: Schema.Number,
  session_id: Schema.String,
  start_last_seq: Schema.Number,
  start_time: Schema.String,
});

/** Replication response. */
export const DatabaseReplicateResponse = Schema.Struct({
  history: Schema.Array(DatabaseReplicationHistoryItem),
  ok: Schema.Boolean,
  replication_id_version: Schema.Number,
  session_id: Schema.String,
  source_last_seq: Schema.Number,
});
export type DatabaseReplicateResponse = typeof DatabaseReplicateResponse.Type;

// ---------------------------------------------------------------------------
// Parameter Types
// ---------------------------------------------------------------------------

/** Params for `PUT /{db}` (create database). */
export interface DatabaseCreateParams {
  readonly n?: number;
  readonly partitioned?: boolean;
  readonly q?: number;
}

/** Params for `GET /{db}/_changes`. */
export interface DatabaseChangesParams {
  readonly doc_ids?: readonly string[];
  readonly conflicts?: boolean;
  readonly descending?: boolean;
  readonly feed?: "normal" | "longpoll" | "continuous" | "eventsource";
  readonly filter?: string;
  readonly heartbeat?: number;
  readonly include_docs?: boolean;
  readonly attachments?: boolean;
  readonly att_encoding_info?: boolean;
  readonly limit?: number;
  readonly since?: string | number;
  readonly style?: string;
  readonly timeout?: number;
  readonly view?: string;
}

/** Options for `POST /_replicate`. */
export interface DatabaseReplicateOptions {
  readonly cancel?: boolean;
  readonly continuous?: boolean;
  readonly create_target?: boolean;
  readonly doc_ids?: readonly string[];
  readonly filter?: string;
  readonly proxy?: string;
  readonly source?: string;
  readonly target?: string;
}

/** Params for `GET /_db_updates`. */
export interface UpdatesParams {
  readonly feed: "longpoll" | "continuous" | "eventsource";
  readonly timeout: number;
  readonly heartbeat: boolean;
  readonly since: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** CouchDB database management operations (create, delete, compact, replicate, changes). */
export class Database extends Context.Service<Database, Database.Database>()("@ceno/core/Database") {}

export namespace Database {
  /** Service shape for database management operations. */
  export interface Database {
    /** Creates a new database. */
    readonly create: (
      name: string,
      options?: DatabaseCreateParams,
    ) => Effect.Effect<
      DatabaseCreateResponse,
      CenoIllegalDatabaseName | CenoUnauthorized | CenoForbidden | CenoAlreadyExists | TransportError
    >;
    /** Retrieves database metadata. */
    readonly get: (
      name: string,
    ) => Effect.Effect<DatabaseGetResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Deletes a database. */
    readonly destroy: (
      name: string,
    ) => Effect.Effect<OkResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Lists all database names. */
    readonly list: Effect.Effect<readonly string[], CenoUnauthorized | CenoForbidden | TransportError>;
    /** Triggers compaction on a database or design document. */
    readonly compact: (
      name: string,
      ddoc?: string,
    ) => Effect.Effect<
      OkResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoBadContentType | TransportError
    >;
    /** Starts a replication between two databases. */
    readonly replicate: (
      options: DatabaseReplicateOptions,
    ) => Effect.Effect<
      DatabaseReplicateResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoInternalServerError | TransportError
    >;
    /** Retrieves the changes feed for a database. */
    readonly changes: (
      name: string,
      options?: DatabaseChangesParams,
    ) => Effect.Effect<DatabaseChangesResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
    /** Streams raw change events as bytes (NDJSON). */
    readonly changesStream: (
      name: string,
      options?: DatabaseChangesParams,
    ) => Effect.Effect<Stream.Stream<Uint8Array, HttpClientError.HttpClientError>, TransportError>;
    /** Retrieves global database update events. */
    readonly updates: (
      options?: UpdatesParams,
    ) => Effect.Effect<DatabaseUpdatesResponse, CenoUnauthorized | CenoForbidden | TransportError>;
  }
}
