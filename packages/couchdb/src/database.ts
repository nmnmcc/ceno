import {
  Database,
  DatabaseChangesResponse,
  DatabaseCreateResponse,
  DatabaseGetResponse,
  DatabaseReplicateResponse,
  DatabaseUpdatesResponse,
  OkResponse,
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

// ---------------------------------------------------------------------------
// API — standalone HttpApi for the database scope
// ---------------------------------------------------------------------------

/** Self-contained HttpApi for CouchDB database management (create, info, delete, compact, replicate, changes, updates), independent of the other scopes. */
export const DatabaseApi = HttpApi.make("database").add(
  HttpApiGroup.make("database", { topLevel: true }).add(
    HttpApiEndpoint.put("create", "/:name", {
      params: Schema.Struct({ name: Schema.String }),
      query: Schema.Struct({
        n: Schema.optional(Schema.NumberFromString),
        q: Schema.optional(Schema.NumberFromString),
        partitioned: Schema.optional(Schema.Boolean),
      }),
      success: DatabaseCreateResponse,
      error: [CenoIllegalDatabaseNameWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoAlreadyExistsWire],
    }),
    HttpApiEndpoint.get("get", "/:name", {
      params: Schema.Struct({ name: Schema.String }),
      success: DatabaseGetResponse,
      error: [CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint["delete"]("destroy", "/:name", {
      params: Schema.Struct({ name: Schema.String }),
      success: OkResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire],
    }),
    HttpApiEndpoint.get("list", "/_all_dbs", {
      success: Schema.Array(Schema.String),
      error: [CenoUnauthorizedWire, CenoForbiddenWire],
    }),
    HttpApiEndpoint.post("compact", "/:name/_compact/:ddoc?", {
      params: Schema.Struct({
        name: Schema.String,
        ddoc: Schema.optional(Schema.String),
      }),
      success: OkResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire, CenoNotFoundWire, CenoBadContentTypeWire],
    }),
    HttpApiEndpoint.post("replicate", "/_replicate", {
      payload: Schema.Unknown,
      success: DatabaseReplicateResponse,
      error: [
        CenoBadRequestWire,
        CenoUnauthorizedWire,
        CenoForbiddenWire,
        CenoNotFoundWire,
        CenoInternalServerErrorWire,
      ],
    }),
    HttpApiEndpoint.get("changes", "/:name/_changes", {
      params: Schema.Struct({ name: Schema.String }),
      query: Schema.Unknown,
      success: DatabaseChangesResponse,
      error: [CenoBadRequestWire, CenoUnauthorizedWire, CenoForbiddenWire],
    }),
    HttpApiEndpoint.get("changesStream", "/:name/_changes", {
      params: Schema.Struct({ name: Schema.String }),
      query: Schema.Unknown,
      success: HttpApiSchema.StreamUint8Array(),
    }),
    HttpApiEndpoint.get("updates", "/_db_updates", {
      query: Schema.Unknown,
      success: DatabaseUpdatesResponse,
      error: [CenoUnauthorizedWire, CenoForbiddenWire],
    }),
  ),
);

// ---------------------------------------------------------------------------
// Service — CouchDB HTTP implementation of @ceno/core's Database
// ---------------------------------------------------------------------------

/** Derives a database-scope client from {@link DatabaseApi} and adapts it to the Database contract. */
const make = Effect.gen(function* () {
  const connect = yield* CouchDbClient;
  const client = yield* connect(DatabaseApi);
  return Database.of({
    create: (name, opts) => client.create({ params: { name }, query: opts ?? {} }),
    get: (name) => client.get({ params: { name } }),
    destroy: (name) => client.destroy({ params: { name } }),
    list: client.list(),
    compact: (name, ddoc) => client.compact({ params: { name, ddoc } }),
    replicate: (opts) => client.replicate({ payload: opts }),
    changes: (name, opts) => client.changes({ params: { name }, query: opts ?? {} }),
    changesStream: (name, opts) => client.changesStream({ params: { name }, query: opts ?? {} }),
    updates: (opts) => client.updates({ query: opts ?? {} }),
  });
});

/** Provides the CouchDB-backed database service; requires a {@link CouchDbClient}. */
export const DatabaseLayer = Layer.effect(Database, make);
