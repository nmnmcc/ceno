import { Data, Schema } from "effect";

type AnyFields = Schema.Struct.Fields;

/** A migration step that transforms data from a previous version's shape to a new one. */
export type MigrateVersion<From = never, Fields extends AnyFields = AnyFields> = {
  readonly from: From;
  readonly to: Fields;
  readonly migrate: (
    from: Schema.Struct.Type<
      From extends { readonly to: infer PrevFields extends AnyFields } ? PrevFields : From & AnyFields
    >,
  ) => Schema.Struct.Type<Fields>;
};

/** A node in a version chain -- either an initial schema or a migration from a previous version. */
export type Version<From = never, Fields extends AnyFields = AnyFields> = Fields | MigrateVersion<From, Fields>;

export const version: {
  <Fields extends AnyFields>(fields: Fields): Fields;
  <From, Fields extends AnyFields>(migration: MigrateVersion<From, Fields>): MigrateVersion<From, Fields>;
} = (v: any) => v;

/** Accumulated decode errors from each version attempted during migration. */
export class MigrateError extends Data.TaggedError("MigrateError")<{
  readonly errors: readonly Schema.SchemaError[];
}> {}
