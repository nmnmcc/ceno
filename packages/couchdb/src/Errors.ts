import {
  CenoAlreadyExists,
  CenoBadContentType,
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoIllegalDatabaseName,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
} from "@ceno/core/Errors";
import { Schema, SchemaGetter } from "effect";
import { HttpApiSchema } from "effect/unstable/httpapi";

const makeCouchDbErrorWire = <Err extends Schema.Top, Tag extends string, ErrorCode extends string>(
  err: Err,
  tag: Tag,
  errorCode: ErrorCode,
  statusCode: number,
) =>
  Schema.Struct({
    error: Schema.Literal(errorCode),
    reason: Schema.String,
  }).pipe(
    Schema.decodeTo(err, {
      decode: SchemaGetter.transform((from: { readonly error: ErrorCode; readonly reason: string }) => ({
        _tag: tag,
        reason: from.reason,
      })),
      encode: SchemaGetter.transform((to: unknown) => ({
        error: errorCode,
        reason: (to as { readonly reason: string }).reason,
      })),
    }),
    HttpApiSchema.status(statusCode),
  );

/** Decodes `{"error":"illegal_database_name","reason":"..."}` into CenoIllegalDatabaseName. */
export const CenoIllegalDatabaseNameWire = makeCouchDbErrorWire(
  CenoIllegalDatabaseName,
  "CenoIllegalDatabaseName",
  "illegal_database_name",
  400,
);

/** Decodes `{"error":"bad_request","reason":"..."}` into CenoBadRequest. */
export const CenoBadRequestWire = makeCouchDbErrorWire(CenoBadRequest, "CenoBadRequest", "bad_request", 400);

/** Decodes `{"error":"unauthorized","reason":"..."}` into CenoUnauthorized. */
export const CenoUnauthorizedWire = makeCouchDbErrorWire(CenoUnauthorized, "CenoUnauthorized", "unauthorized", 401);

/** Decodes `{"error":"forbidden","reason":"..."}` into CenoForbidden. */
export const CenoForbiddenWire = makeCouchDbErrorWire(CenoForbidden, "CenoForbidden", "forbidden", 403);

/** Decodes `{"error":"not_found","reason":"..."}` into CenoNotFound. */
export const CenoNotFoundWire = makeCouchDbErrorWire(CenoNotFound, "CenoNotFound", "not_found", 404);

/** Decodes `{"error":"conflict","reason":"..."}` into CenoConflict. */
export const CenoConflictWire = makeCouchDbErrorWire(CenoConflict, "CenoConflict", "conflict", 409);

/** Decodes `{"error":"file_exists","reason":"..."}` into CenoAlreadyExists. */
export const CenoAlreadyExistsWire = makeCouchDbErrorWire(CenoAlreadyExists, "CenoAlreadyExists", "file_exists", 412);

/** Decodes `{"error":"bad_content_type","reason":"..."}` into CenoBadContentType. */
export const CenoBadContentTypeWire = makeCouchDbErrorWire(
  CenoBadContentType,
  "CenoBadContentType",
  "bad_content_type",
  415,
);

/** Decodes `{"error":"internal_server_error","reason":"..."}` into CenoInternalServerError. */
export const CenoInternalServerErrorWire = makeCouchDbErrorWire(
  CenoInternalServerError,
  "CenoInternalServerError",
  "internal_server_error",
  500,
);
