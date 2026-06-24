import { Effect, Schema } from "effect";

import type {
  DocumentBulkResponse,
  DocumentGetParams,
  DocumentInsertParams,
  DocumentInsertResponse,
  DocumentPutParams,
  MangoQuery,
  MangoResponse,
} from "./Document.ts";
import { Document } from "./Document.ts";
import type {
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoInternalServerError,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./Errors.ts";
import { migrate, toSchema } from "./internal/version.ts";
import type { MigrateError, Version } from "./Version.ts";

/** Document operations that auto-migrate reads and encode writes, parameterised by database name. */
export interface SchemaDocument<F extends Schema.Struct.Fields> {
  /** Retrieves a document by ID, migrating it through the version chain to the current schema. */
  get(
    db: string,
    docid: string,
    options?: DocumentGetParams,
  ): Effect.Effect<
    Schema.Struct.Type<F> & { readonly _id: string; readonly _rev: string },
    CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;

  /** Encodes and inserts a typed document with server-generated or body-provided ID. */
  insert(
    db: string,
    body: Schema.Struct.Type<F>,
    options?: DocumentInsertParams,
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

  /** Encodes and creates or updates a typed document at a specific ID. */
  put(
    db: string,
    docid: string,
    body: Schema.Struct.Type<F>,
    options?: DocumentPutParams,
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

  /** Executes a Mango query and migrates each result document through the version chain. */
  find(
    db: string,
    query: MangoQuery,
  ): Effect.Effect<
    Omit<MangoResponse, "docs"> & { readonly docs: readonly Schema.Struct.Type<F>[] },
    | CenoBadRequest
    | CenoUnauthorized
    | CenoForbidden
    | CenoNotFound
    | CenoInternalServerError
    | TransportError
    | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;

  /** Encodes and inserts multiple typed documents in a single bulk request. */
  bulk(
    db: string,
    docs: readonly Schema.Struct.Type<F>[],
  ): Effect.Effect<
    readonly DocumentBulkResponse[],
    CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError | Schema.SchemaError,
    Schema.Struct.EncodingServices<F>
  >;

  /** Creates a partition-scoped view, binding the partition name. The `find` method still requires a `db` parameter. */
  partitioned(partition: string): SchemaPartitionedDocument<F>;

  /** Creates a database-scoped view of these operations, removing the `db` parameter from every method. */
  in(db: string): SchemaDatabaseDocument<F>;
}

/** Schema-aware document operations narrowed to a single partition, created by calling `partitioned` on a {@link SchemaDocument}. The `find` method still requires a `db` parameter. */
export interface SchemaPartitionedDocument<F extends Schema.Struct.Fields> {
  /** Executes a Mango query within this partition of a database and migrates each result document through the version chain. */
  find(
    db: string,
    query: MangoQuery,
  ): Effect.Effect<
    Omit<MangoResponse, "docs"> & { readonly docs: readonly Schema.Struct.Type<F>[] },
    | CenoBadRequest
    | CenoUnauthorized
    | CenoForbidden
    | CenoNotFound
    | CenoInternalServerError
    | TransportError
    | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;
}

/** Schema-aware document operations narrowed to a single partition within a single database, created by calling `partitioned` on a {@link SchemaDatabaseDocument}. */
export interface SchemaDatabasePartitionedDocument<F extends Schema.Struct.Fields> {
  /** Executes a Mango query within this partition and migrates each result document through the version chain. */
  find(
    query: MangoQuery,
  ): Effect.Effect<
    Omit<MangoResponse, "docs"> & { readonly docs: readonly Schema.Struct.Type<F>[] },
    | CenoBadRequest
    | CenoUnauthorized
    | CenoForbidden
    | CenoNotFound
    | CenoInternalServerError
    | TransportError
    | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;
}

/** Document operations narrowed to a single database, created by calling `in` on a {@link SchemaDocument}. */
export interface SchemaDatabaseDocument<F extends Schema.Struct.Fields> {
  /** Creates a partition-scoped view of these operations for a specific partition. */
  partitioned(partition: string): SchemaDatabasePartitionedDocument<F>;

  /** Retrieves a document by ID, migrating it through the version chain to the current schema. */
  get(
    docid: string,
    options?: DocumentGetParams,
  ): Effect.Effect<
    Schema.Struct.Type<F> & { readonly _id: string; readonly _rev: string },
    CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;

  /** Encodes and inserts a typed document with server-generated or body-provided ID. */
  insert(
    body: Schema.Struct.Type<F>,
    options?: DocumentInsertParams,
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

  /** Encodes and creates or updates a typed document at a specific ID. */
  put(
    docid: string,
    body: Schema.Struct.Type<F>,
    options?: DocumentPutParams,
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

  /** Executes a Mango query and migrates each result document through the version chain. */
  find(
    query: MangoQuery,
  ): Effect.Effect<
    Omit<MangoResponse, "docs"> & { readonly docs: readonly Schema.Struct.Type<F>[] },
    | CenoBadRequest
    | CenoUnauthorized
    | CenoForbidden
    | CenoNotFound
    | CenoInternalServerError
    | TransportError
    | MigrateError,
    Schema.Struct.DecodingServices<F>
  >;

  /** Encodes and inserts multiple typed documents in a single bulk request. */
  bulk(
    docs: readonly Schema.Struct.Type<F>[],
  ): Effect.Effect<
    readonly DocumentBulkResponse[],
    CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError | Schema.SchemaError,
    Schema.Struct.EncodingServices<F>
  >;
}

/** Options for {@link make}. */
export interface SchemaDocumentOptions {
  /** When `true` (the default), a `get` that triggers a version migration will write the migrated document back to the database so subsequent reads hit the latest schema directly. The write-back is best-effort: failures (conflicts, network errors) are silently ignored and the migrated value is still returned. */
  readonly write?: boolean | undefined;
}

/** Creates schema-aware document operations from a version chain. Resolves {@link Document} from the Effect context. */
export const make: <From, F extends Schema.Struct.Fields>(
  version: Version<From, F>,
  options?: SchemaDocumentOptions,
) => Effect.Effect<SchemaDocument<F>, never, Document> = (
  version: any,
  { write = true }: SchemaDocumentOptions = {},
): Effect.Effect<any, never, Document> =>
  Effect.gen(function* () {
    const document = yield* Document;
    const encode = Schema.encodeEffect(toSchema(version));

    const migrateAll = (docs: readonly unknown[]) =>
      Effect.forEach(docs, (doc) => Effect.map(migrate(doc, version), (r) => r.value));

    const partitionedFind = (db: string, partition: string, query: MangoQuery) =>
      Effect.flatMap(document.partitionedFind(db, partition, query), (response) =>
        Effect.map(migrateAll(response.docs), (docs) => ({ ...response, docs })),
      );

    const methods: Omit<SchemaDocument<Schema.Struct.Fields>, "in" | "partitioned"> = {
      get: (d, docid, opts) =>
        Effect.gen(function* () {
          const raw = (yield* document.get(d, docid, opts)) as { _id: string; _rev: string };
          const { _id, _rev } = raw;
          const { value, migrated } = yield* migrate(raw, version);
          if (migrated && write)
            yield* encode(value).pipe(
              Effect.flatMap((encoded) => document.put(d, docid, encoded, { rev: _rev })),
              Effect.forkDetach,
            );
          return { ...value, _id, _rev };
        }),
      insert: (d, body, opts) => Effect.flatMap(encode(body), (encoded) => document.insert(d, encoded, opts)),
      put: (d, docid, body, opts) => Effect.flatMap(encode(body), (encoded) => document.put(d, docid, encoded, opts)),
      find: (d, query) =>
        Effect.flatMap(document.find(d, query), (response) =>
          Effect.map(migrateAll(response.docs), (docs) => ({ ...response, docs })),
        ),
      bulk: (d, docs) =>
        Effect.flatMap(Effect.all(docs.map((doc) => encode(doc))), (encoded) => document.bulk(d, encoded)),
    };

    return {
      ...methods,
      partitioned: (partition: string): SchemaPartitionedDocument<Schema.Struct.Fields> => ({
        find: (db, query) => partitionedFind(db, partition, query),
      }),
      in: (db: string) =>
        ({
          partitioned: (partition): SchemaDatabasePartitionedDocument<Schema.Struct.Fields> => ({
            find: (query) => partitionedFind(db, partition, query),
          }),
          get: (docid, opts) => methods.get(db, docid, opts),
          insert: (body, opts) => methods.insert(db, body, opts),
          put: (docid, body, opts) => methods.put(db, docid, body, opts),
          find: (query) => methods.find(db, query),
          bulk: (docs) => methods.bulk(db, docs),
        }) satisfies SchemaDatabaseDocument<Schema.Struct.Fields>,
    };
  });
