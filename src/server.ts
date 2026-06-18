import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { NenoBadRequestWire, NenoForbiddenWire, NenoUnauthorizedWire } from "./errors.js";

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

/** UUID list from `GET /_uuids`. */
export const UUIDObject = Schema.Struct({
  uuids: Schema.Array(Schema.String),
});

/** Cookie auth response from `POST /_session`. */
export const DatabaseAuthResponse = Schema.Struct({
  ok: Schema.Boolean,
  name: Schema.String,
  roles: Schema.Array(Schema.String),
});

/** Session info from `GET /_session`. */
export const DatabaseSessionResponse = Schema.Struct({
  ok: Schema.Boolean,
  userCtx: Schema.Unknown,
  info: Schema.Unknown,
});

// ---------------------------------------------------------------------------
// API Group
// ---------------------------------------------------------------------------

/** Server-level endpoints. */
export const ServerApi = HttpApiGroup.make("server").add(
  HttpApiEndpoint.get("info", "/", { success: InfoResponse }),
  HttpApiEndpoint.get("uuids", "/_uuids", {
    query: Schema.Struct({ count: Schema.optional(Schema.NumberFromString) }),
    success: UUIDObject,
    error: [NenoBadRequestWire, NenoForbiddenWire],
  }),
  HttpApiEndpoint.post("auth", "/_session", {
    payload: Schema.Struct({ name: Schema.String, password: Schema.String }),
    success: DatabaseAuthResponse,
    error: [NenoBadRequestWire, NenoUnauthorizedWire],
  }),
  HttpApiEndpoint.get("session", "/_session", {
    success: DatabaseSessionResponse,
    error: [NenoUnauthorizedWire],
  }),
);
