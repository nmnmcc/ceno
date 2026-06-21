import { Schema } from "effect";
import type { HttpClientError } from "effect/unstable/http";

// ---------------------------------------------------------------------------
// Domain error classes — Schema.TaggedErrorClass for catchTag + Schema use
// ---------------------------------------------------------------------------

/** Invalid database name. */
export class CenoIllegalDatabaseName extends Schema.TaggedErrorClass<CenoIllegalDatabaseName>()(
  "CenoIllegalDatabaseName",
  { reason: Schema.String },
) {}

/** Bad request body, params, or query string. */
export class CenoBadRequest extends Schema.TaggedErrorClass<CenoBadRequest>()("CenoBadRequest", {
  reason: Schema.String,
}) {}

/** Missing or invalid credentials. */
export class CenoUnauthorized extends Schema.TaggedErrorClass<CenoUnauthorized>()("CenoUnauthorized", {
  reason: Schema.String,
}) {}

/** Authenticated but not enough permissions. */
export class CenoForbidden extends Schema.TaggedErrorClass<CenoForbidden>()("CenoForbidden", {
  reason: Schema.String,
}) {}

/** Requested database, document, or design document does not exist. */
export class CenoNotFound extends Schema.TaggedErrorClass<CenoNotFound>()("CenoNotFound", { reason: Schema.String }) {}

/** Document revision conflict. */
export class CenoConflict extends Schema.TaggedErrorClass<CenoConflict>()("CenoConflict", { reason: Schema.String }) {}

/** Database already exists. */
export class CenoAlreadyExists extends Schema.TaggedErrorClass<CenoAlreadyExists>()("CenoAlreadyExists", {
  reason: Schema.String,
}) {}

/** Request payload was sent in an unsupported format. */
export class CenoBadContentType extends Schema.TaggedErrorClass<CenoBadContentType>()("CenoBadContentType", {
  reason: Schema.String,
}) {}

/** Internal server error. */
export class CenoInternalServerError extends Schema.TaggedErrorClass<CenoInternalServerError>()(
  "CenoInternalServerError",
  { reason: Schema.String },
) {}

// ---------------------------------------------------------------------------
// Transport / aggregate types
// ---------------------------------------------------------------------------

/** Transport-level or decoding failure from the underlying backend. */
export type TransportError = HttpClientError.HttpClientError | Schema.SchemaError;

/** Union of all ceno domain errors. */
export type CenoError =
  | CenoIllegalDatabaseName
  | CenoBadRequest
  | CenoUnauthorized
  | CenoForbidden
  | CenoNotFound
  | CenoConflict
  | CenoAlreadyExists
  | CenoBadContentType
  | CenoInternalServerError;
