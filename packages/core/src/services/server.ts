import { Context, Schema, type Effect } from "effect";

import type { OkResponse } from "./database";
import type { CenoBadRequest, CenoForbidden, CenoUnauthorized, TransportError } from "./errors";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Server metadata from `GET /`. */
export const InfoResponse = Schema.Struct({
  couchdb: Schema.String,
  version: Schema.String,
  git_sha: Schema.String,
  uuid: Schema.String,
  features: Schema.Array(Schema.String),
  vendor: Schema.Struct({ name: Schema.String }),
});
export type InfoResponse = typeof InfoResponse.Type;

/** UUID list from `GET /_uuids`. */
export const UUIDObject = Schema.Struct({
  uuids: Schema.Array(Schema.String),
});
export type UUIDObject = typeof UUIDObject.Type;

/** Cookie auth response from `POST /_session`. */
export const DatabaseAuthResponse = Schema.Struct({
  ok: Schema.Boolean,
  name: Schema.String,
  roles: Schema.Array(Schema.String),
});
export type DatabaseAuthResponse = typeof DatabaseAuthResponse.Type;

/** Session info from `GET /_session`. */
export const DatabaseSessionResponse = Schema.Struct({
  ok: Schema.Boolean,
  userCtx: Schema.Struct({
    name: Schema.NullOr(Schema.String),
    roles: Schema.Array(Schema.String),
  }),
  info: Schema.Struct({
    authenticated: Schema.optional(Schema.String),
    authentication_db: Schema.optional(Schema.String),
    authentication_handlers: Schema.optional(Schema.Array(Schema.String)),
  }),
});
export type DatabaseSessionResponse = typeof DatabaseSessionResponse.Type;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** CouchDB server-level operations (metadata, UUIDs, authentication). */
export class Server extends Context.Service<Server, Server.Server>()("@ceno/core/Server") {}

export namespace Server {
  /** Service shape for server-level CouchDB operations. */
  export interface Server {
    /** Retrieves CouchDB server metadata. */
    readonly info: Effect.Effect<InfoResponse, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Generates one or more UUIDs on the server. */
    readonly uuids: (options?: {
      readonly count?: number;
    }) => Effect.Effect<UUIDObject, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
    /** Authenticates via cookie-based session. */
    readonly auth: (credentials: {
      readonly name: string;
      readonly password: string;
    }) => Effect.Effect<DatabaseAuthResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
    /** Retrieves current session info. */
    readonly session: Effect.Effect<DatabaseSessionResponse, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Closes the current session (cookie-based logout). */
    readonly logout: Effect.Effect<OkResponse, CenoUnauthorized | CenoForbidden | TransportError>;
  }
}
