import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import {
  NenoAlreadyExistsWire,
  NenoBadContentTypeWire,
  NenoBadRequestWire,
  NenoForbiddenWire,
  NenoIllegalDatabaseNameWire,
  NenoInternalServerErrorWire,
  NenoNotFoundWire,
  NenoUnauthorizedWire,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Generic `{"ok": true}` response. */
export const OkResponse = Schema.Struct({ ok: Schema.Boolean });

/** Response from `PUT /{db}` (create database). */
export const DatabaseCreateResponse = Schema.Struct({
  ok: Schema.Boolean,
});

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

/** Single entry from `GET /{db}/_changes`. */
export const DatabaseChangesResultItem = Schema.Struct({
  changes: Schema.Array(Schema.Struct({ rev: Schema.String })),
  id: Schema.String,
  seq: Schema.Unknown,
  deleted: Schema.optional(Schema.Boolean),
});

/** Changes feed response. */
export const DatabaseChangesResponse = Schema.Struct({
  last_seq: Schema.Unknown,
  pending: Schema.Number,
  results: Schema.Array(DatabaseChangesResultItem),
});

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
// API Group
// ---------------------------------------------------------------------------

/** Database management endpoints. */
export const DatabaseApi = HttpApiGroup.make("database")
  .add(
    HttpApiEndpoint.put("create", "/:name", {
      params: Schema.Struct({ name: Schema.String }),
      query: Schema.Struct({
        n: Schema.optional(Schema.NumberFromString),
        q: Schema.optional(Schema.NumberFromString),
        partitioned: Schema.optional(Schema.Boolean),
      }),
      success: DatabaseCreateResponse,
      error: [NenoIllegalDatabaseNameWire, NenoUnauthorizedWire, NenoForbiddenWire, NenoAlreadyExistsWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("get", "/:name", {
      params: Schema.Struct({ name: Schema.String }),
      success: DatabaseGetResponse,
      error: [NenoUnauthorizedWire, NenoForbiddenWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint["delete"]("destroy", "/:name", {
      params: Schema.Struct({ name: Schema.String }),
      success: OkResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoForbiddenWire, NenoNotFoundWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("list", "/_all_dbs", {
      success: Schema.Array(Schema.String),
      error: [NenoUnauthorizedWire, NenoForbiddenWire],
    }),
  )
  .add(
    HttpApiEndpoint.post("compact", "/:name/_compact/:ddoc?", {
      params: Schema.Struct({
        name: Schema.String,
        ddoc: Schema.optional(Schema.String),
      }),
      success: OkResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoForbiddenWire, NenoNotFoundWire, NenoBadContentTypeWire],
    }),
  )
  .add(
    HttpApiEndpoint.post("replicate", "/_replicate", {
      payload: Schema.Unknown,
      success: DatabaseReplicateResponse,
      error: [
        NenoBadRequestWire,
        NenoUnauthorizedWire,
        NenoForbiddenWire,
        NenoNotFoundWire,
        NenoInternalServerErrorWire,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.get("changes", "/:name/_changes", {
      params: Schema.Struct({ name: Schema.String }),
      query: Schema.Unknown,
      success: DatabaseChangesResponse,
      error: [NenoBadRequestWire, NenoUnauthorizedWire, NenoForbiddenWire],
    }),
  )
  .add(
    HttpApiEndpoint.get("changesStream", "/:name/_changes", {
      params: Schema.Struct({ name: Schema.String }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
  )
  .add(
    HttpApiEndpoint.get("updates", "/_db_updates", {
      query: Schema.Unknown,
      success: DatabaseUpdatesResponse,
      error: [NenoUnauthorizedWire, NenoForbiddenWire],
    }),
  );
