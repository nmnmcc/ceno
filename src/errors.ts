import { Schema, SchemaGetter } from "effect";
import { HttpApiSchema } from "effect/unstable/httpapi";

// ---------------------------------------------------------------------------
// CouchDB error classes — Schema.TaggedErrorClass for catchTag + Schema use
// ---------------------------------------------------------------------------

/** Invalid database name. */
export class NenoIllegalDatabaseName extends Schema.TaggedErrorClass<NenoIllegalDatabaseName>()(
  "NenoIllegalDatabaseName",
  { reason: Schema.String },
) {}

/** Bad request body, params, or query string. */
export class NenoBadRequest extends Schema.TaggedErrorClass<NenoBadRequest>()(
  "NenoBadRequest",
  { reason: Schema.String },
) {}

/** Missing or invalid credentials. */
export class NenoUnauthorized extends Schema.TaggedErrorClass<NenoUnauthorized>()(
  "NenoUnauthorized",
  { reason: Schema.String },
) {}

/** Authenticated but not enough permissions. */
export class NenoForbidden extends Schema.TaggedErrorClass<NenoForbidden>()(
  "NenoForbidden",
  { reason: Schema.String },
) {}

/** Database, document, or design doc not found. */
export class NenoNotFound extends Schema.TaggedErrorClass<NenoNotFound>()(
  "NenoNotFound",
  { reason: Schema.String },
) {}

/** Document revision conflict. */
export class NenoConflict extends Schema.TaggedErrorClass<NenoConflict>()(
  "NenoConflict",
  { reason: Schema.String },
) {}

/** Database already exists (412 `file_exists`). */
export class NenoAlreadyExists extends Schema.TaggedErrorClass<NenoAlreadyExists>()(
  "NenoAlreadyExists",
  { reason: Schema.String },
) {}

/** Wrong Content-Type (not `application/json`). */
export class NenoBadContentType extends Schema.TaggedErrorClass<NenoBadContentType>()(
  "NenoBadContentType",
  { reason: Schema.String },
) {}

/** Internal server error. */
export class NenoInternalServerError extends Schema.TaggedErrorClass<NenoInternalServerError>()(
  "NenoInternalServerError",
  { reason: Schema.String },
) {}

// ---------------------------------------------------------------------------
// Wire-format decoder helper
// ---------------------------------------------------------------------------

const makeCouchDbErrorWire = <Tag extends string, ErrorCode extends string>(
  errClass: Schema.Top,
  tag: Tag,
  errorCode: ErrorCode,
  statusCode: number,
) =>
  Schema.Struct({
    error: Schema.Literal(errorCode),
    reason: Schema.String,
  }).pipe(
    Schema.decodeTo(errClass, {
      decode: SchemaGetter.transform(
        (from: { readonly error: ErrorCode; readonly reason: string }) => ({
          _tag: tag,
          reason: from.reason,
        }),
      ),
      encode: SchemaGetter.transform((to: unknown) => ({
        error: errorCode,
        reason: (to as { readonly reason: string }).reason,
      })),
    }),
    HttpApiSchema.status(statusCode),
  );

// ---------------------------------------------------------------------------
// Wire-format decoders — CouchDB JSON → NenoXxx error instances
// ---------------------------------------------------------------------------

/** Decodes `{"error":"illegal_database_name","reason":"..."}` into NenoIllegalDatabaseName. */
export const NenoIllegalDatabaseNameWire = makeCouchDbErrorWire(
  NenoIllegalDatabaseName,
  "NenoIllegalDatabaseName",
  "illegal_database_name",
  400,
);

/** Decodes `{"error":"bad_request","reason":"..."}` into NenoBadRequest. */
export const NenoBadRequestWire = makeCouchDbErrorWire(NenoBadRequest, "NenoBadRequest", "bad_request", 400);

/** Decodes `{"error":"unauthorized","reason":"..."}` into NenoUnauthorized. */
export const NenoUnauthorizedWire = makeCouchDbErrorWire(NenoUnauthorized, "NenoUnauthorized", "unauthorized", 401);

/** Decodes `{"error":"forbidden","reason":"..."}` into NenoForbidden. */
export const NenoForbiddenWire = makeCouchDbErrorWire(NenoForbidden, "NenoForbidden", "forbidden", 403);

/** Decodes `{"error":"not_found","reason":"..."}` into NenoNotFound. */
export const NenoNotFoundWire = makeCouchDbErrorWire(NenoNotFound, "NenoNotFound", "not_found", 404);

/** Decodes `{"error":"conflict","reason":"..."}` into NenoConflict. */
export const NenoConflictWire = makeCouchDbErrorWire(NenoConflict, "NenoConflict", "conflict", 409);

/** Decodes `{"error":"file_exists","reason":"..."}` into NenoAlreadyExists. */
export const NenoAlreadyExistsWire = makeCouchDbErrorWire(NenoAlreadyExists, "NenoAlreadyExists", "file_exists", 412);

/** Decodes `{"error":"bad_content_type","reason":"..."}` into NenoBadContentType. */
export const NenoBadContentTypeWire = makeCouchDbErrorWire(
  NenoBadContentType,
  "NenoBadContentType",
  "bad_content_type",
  415,
);

/** Decodes `{"error":"internal_server_error","reason":"..."}` into NenoInternalServerError. */
export const NenoInternalServerErrorWire = makeCouchDbErrorWire(
  NenoInternalServerError,
  "NenoInternalServerError",
  "internal_server_error",
  500,
);

// ---------------------------------------------------------------------------
// Aggregate union
// ---------------------------------------------------------------------------

/** Union of all neno CouchDB errors. */
export type NenoError =
  | NenoIllegalDatabaseName
  | NenoBadRequest
  | NenoUnauthorized
  | NenoForbidden
  | NenoNotFound
  | NenoConflict
  | NenoAlreadyExists
  | NenoBadContentType
  | NenoInternalServerError;
