import {
  Database,
  DatabaseChangesResponse,
  DatabaseChangesResultItem,
  DatabaseCreateResponse,
  DatabaseGetResponse,
  DatabaseReplicateResponse,
  DatabaseUpdatesResponse,
  DbsInfoResponse,
  EnsureFullCommitResponse,
  OkResponse,
  parseNdjsonStream,
  SecurityObject,
} from "@ceno/core";
import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";

import { CouchDbClient } from "./client";
import {
  CenoAlreadyExistsWire,
  CenoBadContentTypeWire,
  CenoBadRequestWire,
  CenoForbiddenWire,
  CenoIllegalDatabaseNameWire,
  CenoInternalServerErrorWire,
  CenoNotFoundWire,
  CenoUnauthorizedWire,
} from "./errors";

/** CouchDB HTTP implementation of the database scope: create, info, delete, compact, replicate, changes, security, maintenance. */
export namespace CouchDbDatabase {
  /** Self-contained HttpApi for CouchDB database management endpoints, independent of the other scopes. */
  export const Api = HttpApi.make("database").add(
    HttpApiGroup.make("database", { topLevel: true }).add(
      // ─── CRUD ───
      HttpApiEndpoint.put("create", "/:name", {
        params: Schema.Struct({ name: Schema.String }),
        query: Schema.Struct({
          n: Schema.optional(Schema.NumberFromString),
          q: Schema.optional(Schema.NumberFromString),
          partitioned: Schema.optional(Schema.Boolean),
        }),
        success: [
          DatabaseCreateResponse.pipe(HttpApiSchema.status(201)),
          DatabaseCreateResponse.pipe(HttpApiSchema.status(202)),
        ],
        error: [CenoIllegalDatabaseNameWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoAlreadyExistsWire],
      }),
      HttpApiEndpoint.get("get", "/:name", {
        params: Schema.Struct({ name: Schema.String }),
        success: DatabaseGetResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint.head("head", "/:name", {
        params: Schema.Struct({ name: Schema.String }),
        success: Schema.Void,
        error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
      }),
      HttpApiEndpoint["delete"]("destroy", "/:name", {
        params: Schema.Struct({ name: Schema.String }),
        success: [OkResponse, OkResponse.pipe(HttpApiSchema.status(202))],
        error: [
          CenoIllegalDatabaseNameWire,
          CenoBadRequestWire,
          CenoUnauthorizedWire,
          CenoForbiddenWire,
          CenoNotFoundWire,
        ],
      }),
      // ─── Listing ───
      HttpApiEndpoint.get("list", "/_all_dbs", {
        query: Schema.Unknown,
        success: Schema.Array(Schema.String),
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.get("dbsInfo", "/_dbs_info", {
        query: Schema.Unknown,
        success: DbsInfoResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("dbsInfoPost", "/_dbs_info", {
        payload: Schema.Unknown,
        success: DbsInfoResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      // ─── Compaction & cleanup ───
      HttpApiEndpoint.post("compact", "/:name/_compact/:ddoc?", {
        params: Schema.Struct({
          name: Schema.String,
          ddoc: Schema.optional(Schema.String),
        }),
        payload: Schema.Unknown,
        success: OkResponse.pipe(HttpApiSchema.status(202)),
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoBadContentTypeWire],
      }),
      HttpApiEndpoint.post("viewCleanup", "/:name/_view_cleanup", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Unknown,
        success: OkResponse.pipe(HttpApiSchema.status(202)),
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoBadContentTypeWire],
      }),
      HttpApiEndpoint.post("ensureFullCommit", "/:name/_ensure_full_commit", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Unknown,
        success: EnsureFullCommitResponse.pipe(HttpApiSchema.status(201)),
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoBadContentTypeWire],
      }),
      // ─── Security ───
      HttpApiEndpoint.get("getSecurity", "/:name/_security", {
        params: Schema.Struct({ name: Schema.String }),
        success: SecurityObject,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.put("setSecurity", "/:name/_security", {
        params: Schema.Struct({ name: Schema.String }),
        payload: SecurityObject,
        success: OkResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      // ─── Revision management ───
      HttpApiEndpoint.get("getRevsLimit", "/:name/_revs_limit", {
        params: Schema.Struct({ name: Schema.String }),
        success: Schema.Number,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.put("setRevsLimit", "/:name/_revs_limit", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Number,
        success: OkResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("purge", "/:name/_purge", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Unknown,
        success: [Schema.Unknown.pipe(HttpApiSchema.status(201)), Schema.Unknown.pipe(HttpApiSchema.status(202))],
        error: [
          CenoBadRequestWire,
          CenoUnauthorizedWire,
          CenoForbiddenWire,
          CenoBadContentTypeWire,
          CenoInternalServerErrorWire,
        ],
      }),
      HttpApiEndpoint.get("getPurgedInfosLimit", "/:name/_purged_infos_limit", {
        params: Schema.Struct({ name: Schema.String }),
        success: Schema.Number,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.put("setPurgedInfosLimit", "/:name/_purged_infos_limit", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Number,
        success: OkResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("missingRevs", "/:name/_missing_revs", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Unknown,
        success: Schema.Unknown,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("revsDiff", "/:name/_revs_diff", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Unknown,
        success: Schema.Unknown,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      // ─── Replication ───
      HttpApiEndpoint.post("replicate", "/_replicate", {
        payload: Schema.Unknown,
        success: [DatabaseReplicateResponse, DatabaseReplicateResponse.pipe(HttpApiSchema.status(202))],
        error: [
          CenoBadRequestWire,
          CenoUnauthorizedWire,
          CenoForbiddenWire,
          CenoNotFoundWire,
          CenoInternalServerErrorWire,
        ],
      }),
      // ─── Changes ───
      HttpApiEndpoint.get("changes", "/:name/_changes", {
        params: Schema.Struct({ name: Schema.String }),
        query: Schema.Unknown,
        success: DatabaseChangesResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.post("changesPost", "/:name/_changes", {
        params: Schema.Struct({ name: Schema.String }),
        payload: Schema.Unknown,
        success: DatabaseChangesResponse,
        error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
      }),
      HttpApiEndpoint.get("changesStream", "/:name/_changes", {
        params: Schema.Struct({ name: Schema.String }),
        query: Schema.Unknown,
        success: HttpApiSchema.StreamUint8Array(),
      }),
      // ─── Updates ───
      HttpApiEndpoint.get("updates", "/_db_updates", {
        query: Schema.Unknown,
        success: DatabaseUpdatesResponse,
        error: [CenoUnauthorizedWire, CenoForbiddenWire],
      }),
    ),
  );

  /** Provides the CouchDB-backed database service; requires a {@link CouchDbClient}. */
  export const layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const connect = yield* CouchDbClient;
      const client = yield* connect(Api);
      return Database.of({
        create: (name, opts) => client.create({ params: { name }, query: opts ?? {} }),
        get: (name) => client.get({ params: { name } }),
        head: (name) => client.head({ params: { name } }),
        destroy: (name) => client.destroy({ params: { name } }),
        list: (opts) => client.list({ query: opts ?? {} }),
        dbsInfo: (opts) => client.dbsInfo({ query: opts ?? {} }),
        dbsInfoPost: (keys) => client.dbsInfoPost({ payload: { keys } }),
        compact: (name, ddoc) => client.compact({ params: { name, ddoc }, payload: {} }),
        viewCleanup: (name) => client.viewCleanup({ params: { name }, payload: {} }),
        ensureFullCommit: (name) => client.ensureFullCommit({ params: { name }, payload: {} }),
        getSecurity: (name) => client.getSecurity({ params: { name } }),
        setSecurity: (name, security) => client.setSecurity({ params: { name }, payload: security }),
        getRevsLimit: (name) => client.getRevsLimit({ params: { name } }),
        setRevsLimit: (name, limit) => client.setRevsLimit({ params: { name }, payload: limit }),
        purge: (name, body) => client.purge({ params: { name }, payload: body }),
        getPurgedInfosLimit: (name) => client.getPurgedInfosLimit({ params: { name } }),
        setPurgedInfosLimit: (name, limit) => client.setPurgedInfosLimit({ params: { name }, payload: limit }),
        missingRevs: (name, body) => client.missingRevs({ params: { name }, payload: body }),
        revsDiff: (name, body) => client.revsDiff({ params: { name }, payload: body }),
        replicate: (opts) => client.replicate({ payload: opts }),
        changes: (name, opts) => client.changes({ params: { name }, query: opts ?? {} }),
        changesPost: (name, body) => client.changesPost({ params: { name }, payload: body }),
        changesStream: (name, opts) =>
          Effect.map(
            client.changesStream({ params: { name }, query: opts ?? {} }),
            parseNdjsonStream(DatabaseChangesResultItem),
          ),
        updates: (opts) => client.updates({ query: opts ?? {} }),
      });
    }),
  );
}
