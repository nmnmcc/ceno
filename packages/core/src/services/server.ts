import { Context, Schema, type Effect } from "effect";

import type { OkResponse } from "./database";
import type { CenoBadRequest, CenoForbidden, CenoUnauthorized, TransportError } from "./errors";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Server identity and capability metadata. */
export const InfoResponse = Schema.Struct({
  couchdb: Schema.String,
  version: Schema.String,
  git_sha: Schema.String,
  uuid: Schema.String,
  features: Schema.Array(Schema.String),
  vendor: Schema.Struct({ name: Schema.String }),
});
export type InfoResponse = typeof InfoResponse.Type;

/** A batch of server-generated unique identifiers. */
export const UUIDObject = Schema.Struct({
  uuids: Schema.Array(Schema.String),
});
export type UUIDObject = typeof UUIDObject.Type;

/** Result of establishing an authenticated session. */
export const DatabaseAuthResponse = Schema.Struct({
  ok: Schema.Boolean,
  name: Schema.String,
  roles: Schema.Array(Schema.String),
});
export type DatabaseAuthResponse = typeof DatabaseAuthResponse.Type;

/** Details of the current authenticated session. */
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

/** Server-level operations: metadata, identifier generation, and authentication. */
export class Server extends Context.Service<Server, Server.Server>()("@ceno/core/Server") {}

export namespace Server {
  /** Service shape for server-level operations. */
  export interface Server {
    /** Retrieves server identity and capability metadata. */
    readonly info: Effect.Effect<InfoResponse, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Generates one or more UUIDs on the server. */
    uuids(options?: {
      readonly count?: number;
    }): Effect.Effect<UUIDObject, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
    /** Cookie-based authentication session: inspect the current user, log in, and log out. */
    readonly session: {
      /** Retrieves info about the current session and authenticated user. */
      readonly current: Effect.Effect<DatabaseSessionResponse, CenoUnauthorized | CenoForbidden | TransportError>;
      /** Authenticates with a name and password, establishing a cookie-based session. */
      login(credentials: {
        readonly name: string;
        readonly password: string;
      }): Effect.Effect<DatabaseAuthResponse, CenoBadRequest | CenoUnauthorized | CenoForbidden | TransportError>;
      /** Closes the current session (cookie-based logout). */
      readonly logout: Effect.Effect<OkResponse, CenoUnauthorized | CenoForbidden | TransportError>;
    };
  }
}
