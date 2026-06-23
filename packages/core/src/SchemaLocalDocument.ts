import { Effect, Schema } from "effect";

import type { DocumentInsertResponse } from "./Document.ts";
import type {
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./Errors.ts";
import { migrate, toSchema } from "./internal/version.ts";
import { LocalDocument } from "./LocalDocument.ts";
import type { MigrateError, Version } from "./Version.ts";

/** Local document operations that auto-migrate reads and encode writes, parameterised by database name. */
export interface SchemaLocalDocument<F extends Schema.Struct.Fields> {
  /** Retrieves a local document by ID, migrating it through the version chain to the current schema. */
  get(
    db: string,
    docid: string,
  ): Effect.Effect<
    Schema.Struct.Type<F> & { readonly _id: string; readonly _rev: string },
    CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;

  /** Encodes and creates or updates a local document at a specific ID. */
  insert(
    db: string,
    docid: string,
    body: Schema.Struct.Type<F>,
    options?: { readonly rev?: string | undefined },
  ): Effect.Effect<
    DocumentInsertResponse,
    | CenoBadRequest
    | CenoUnauthorized
    | CenoForbidden
    | CenoNotFound
    | CenoConflict
    | TransportError
    | Schema.SchemaError,
    Schema.Struct.EncodingServices<F>
  >;

  /** Creates a database-scoped view of these operations, removing the `db` parameter from every method. */
  in(db: string): SchemaDatabaseLocalDocument<F>;
}

/** Local document operations narrowed to a single database, created by calling `in` on a {@link SchemaLocalDocument}. */
export interface SchemaDatabaseLocalDocument<F extends Schema.Struct.Fields> {
  /** Retrieves a local document by ID, migrating it through the version chain to the current schema. */
  get(
    docid: string,
  ): Effect.Effect<
    Schema.Struct.Type<F> & { readonly _id: string; readonly _rev: string },
    CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;

  /** Encodes and creates or updates a local document at a specific ID. */
  insert(
    docid: string,
    body: Schema.Struct.Type<F>,
    options?: { readonly rev?: string | undefined },
  ): Effect.Effect<
    DocumentInsertResponse,
    | CenoBadRequest
    | CenoUnauthorized
    | CenoForbidden
    | CenoNotFound
    | CenoConflict
    | TransportError
    | Schema.SchemaError,
    Schema.Struct.EncodingServices<F>
  >;
}

/** Creates schema-aware local document operations from a version chain. Resolves {@link LocalDocument} from the Effect context. */
export const make: <From, F extends Schema.Struct.Fields>(
  version: Version<From, F>,
) => Effect.Effect<SchemaLocalDocument<F>, never, LocalDocument> = (
  version: any,
): Effect.Effect<any, never, LocalDocument> =>
  Effect.gen(function* () {
    const local = yield* LocalDocument;
    const encode = Schema.encodeEffect(toSchema(version));

    const methods: Omit<SchemaLocalDocument<Schema.Struct.Fields>, "in"> = {
      get: (d, docid) =>
        Effect.flatMap(local.get(d, docid), (raw) => {
          const { _id, _rev } = raw as { _id: string; _rev: string };
          return Effect.map(migrate(raw, version), (data) => ({ ...data, _id, _rev }));
        }),
      insert: (d, docid, body, options) =>
        Effect.flatMap(encode(body), (encoded) => local.insert(d, docid, encoded, options)),
    };

    return {
      ...methods,
      in: (db: string) =>
        ({
          get: (docid) => methods.get(db, docid),
          insert: (docid, body, options) => methods.insert(db, docid, body, options),
        }) satisfies SchemaDatabaseLocalDocument<Schema.Struct.Fields>,
    };
  });
