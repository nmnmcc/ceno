import type {
  CenoBadRequest,
  CenoForbidden,
  CenoNotFound,
  CenoUnauthorized,
  DatabaseChangesParams,
  DatabaseListParams,
  TransportError,
} from "@ceno/core";
import {
  Database,
  DatabaseChangesResponse,
  DatabaseChangesResultItem,
  DatabaseCreateResponse,
  DatabaseGetResponse,
  DatabaseReplicateResponse,
  DatabaseUpdatesResponse,
  DbsInfoResponse,
  OkResponse,
  parseNdjsonStream,
  SecurityObject,
} from "@ceno/core";
import { Effect, Layer, Match, Schema, type Stream } from "effect";
import type { HttpClientError } from "effect/unstable/http";
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

      // `info` collapses three CouchDB endpoints behind one call: a single db
      // name hits `GET /:name`, an array of names hits `POST /_dbs_info`, and
      // anything else lists databases via `GET /_dbs_info`.
      function info(
        name: string,
      ): Effect.Effect<DatabaseGetResponse, CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
      function info(
        options?: DatabaseListParams,
      ): Effect.Effect<DbsInfoResponse, CenoUnauthorized | CenoForbidden | TransportError>;
      function info(
        keys: readonly string[],
      ): Effect.Effect<DbsInfoResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
      function info(arg?: string | readonly string[] | DatabaseListParams) {
        return Match.value(arg).pipe(
          Match.when(Match.string, (name) => client.get({ params: { name } })),
          Match.when(Array.isArray, (keys) => client.dbsInfoPost({ payload: { keys } })),
          Match.orElse((options) => client.dbsInfo({ query: options ?? {} })),
        );
      }

      // `changes` routes by its second argument: a `{ stream: true }` flag opens
      // the parsed NDJSON stream, a body carrying `selector`/`doc_ids` needs the
      // POST form, and everything else is the plain GET changes feed.
      const wantsStream = (o: unknown): o is { readonly stream: true } =>
        typeof o === "object" && o !== null && "stream" in o && o.stream === true;
      const needsBody = (o: unknown): o is object =>
        typeof o === "object" && o !== null && ("selector" in o || "doc_ids" in o);
      function changes(
        name: string,
        options?: DatabaseChangesParams,
      ): Effect.Effect<DatabaseChangesResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
      function changes(
        name: string,
        options: DatabaseChangesParams & { readonly stream: true },
      ): Effect.Effect<
        Stream.Stream<DatabaseChangesResultItem, HttpClientError.HttpClientError | Schema.SchemaError>,
        TransportError
      >;
      function changes(
        name: string,
        body: unknown,
      ): Effect.Effect<DatabaseChangesResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
      function changes(name: string, options?: unknown) {
        return Match.value(options).pipe(
          Match.when(wantsStream, ({ stream: _stream, ...query }) =>
            Effect.map(client.changesStream({ params: { name }, query }), parseNdjsonStream(DatabaseChangesResultItem)),
          ),
          Match.when(needsBody, (body) => client.changesPost({ params: { name }, payload: body })),
          Match.orElse((query) => client.changes({ params: { name }, query: query ?? {} })),
        );
      }

      return Database.of({
        create: (name, opts) => client.create({ params: { name }, query: opts ?? {} }),
        // A successful HEAD means the database exists; a 404 is the negative
        // answer rather than an error, so it is folded into `false`. CouchDB
        // sends no body on a HEAD, so the miss arrives as a raw 404 status code
        // rather than a decoded `CenoNotFound`.
        exists: (name) =>
          client.head({ params: { name } }).pipe(
            Effect.as(true),
            Effect.catchTag("CenoNotFound", () => Effect.succeed(false)),
            Effect.catchIf(
              (error) =>
                error._tag === "HttpClientError" &&
                error.reason._tag === "StatusCodeError" &&
                error.reason.response.status === 404,
              () => Effect.succeed(false),
            ),
          ),
        destroy: (name) => client.destroy({ params: { name } }),
        list: (opts) => client.list({ query: opts ?? {} }),
        info,
        compact: (name, ddoc) => client.compact({ params: { name, ddoc }, payload: {} }),
        viewCleanup: (name) => client.viewCleanup({ params: { name }, payload: {} }),
        security: {
          get: (name) => client.getSecurity({ params: { name } }),
          set: (name, security) => client.setSecurity({ params: { name }, payload: security }),
        },
        revs: {
          limit: {
            get: (name) => client.getRevsLimit({ params: { name } }),
            set: (name, limit) => client.setRevsLimit({ params: { name }, payload: limit }),
          },
          missing: (name, body) => client.missingRevs({ params: { name }, payload: body }),
          diff: (name, body) => client.revsDiff({ params: { name }, payload: body }),
        },
        purge: (name, body) => client.purge({ params: { name }, payload: body }),
        purgedInfosLimit: {
          get: (name) => client.getPurgedInfosLimit({ params: { name } }),
          set: (name, limit) => client.setPurgedInfosLimit({ params: { name }, payload: limit }),
        },
        replicate: (opts) => client.replicate({ payload: opts }),
        changes,
        updates: (opts) => client.updates({ query: opts ?? {} }),
      });
    }),
  );
}
