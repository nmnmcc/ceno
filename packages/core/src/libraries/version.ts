import { Cause, Context, Data, Effect, Exit, Schema } from "effect";

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

export const isMigrateVersion = <From = never, Fields extends AnyFields = AnyFields>(
  version: Version<From, Fields>,
): version is MigrateVersion<From, Fields> => typeof version.migrate === "function";

/** A node in a version chain — either an initial schema or a migration from a previous version. */
export type Version<From = never, Fields extends AnyFields = AnyFields> = Fields | MigrateVersion<From, Fields>;

export const version: {
  <Fields extends AnyFields>(fields: Fields): Fields;
  <From, Fields extends AnyFields>(migration: MigrateVersion<From, Fields>): MigrateVersion<From, Fields>;
} = (v: any) => v;

/** Accumulated decode errors from each version attempted during migration. */
export class MigrateError extends Data.TaggedError("MigrateError")<{
  readonly errors: readonly Schema.SchemaError[];
}> {}

const MigrateErrorContext = Context.Reference<readonly Schema.SchemaError[]>("@ceno/schema/MigrateContext", {
  defaultValue: () => [],
});

/** Decodes unknown data through a version chain, trying the newest schema first and falling back through migrations. */
export const migrate = (data: unknown, version: any): Effect.Effect<any, MigrateError, any> =>
  Effect.gen(function* () {
    if (!("migrate" in version)) {
      const exit = yield* Schema.decodeUnknownEffect(Schema.Struct(version))(data).pipe(Effect.exit);
      if (Exit.isSuccess(exit)) return exit.value;

      const accumulated = yield* MigrateErrorContext;
      const errors = exit.cause.reasons.filter(Cause.isFailReason).map((r) => r.error);
      return yield* new MigrateError({ errors: [...accumulated, ...errors] });
    }

    const exit = yield* Schema.decodeUnknownEffect(Schema.Struct(version.to))(data).pipe(Effect.exit);
    if (Exit.isSuccess(exit)) return exit.value;

    const accumulated = yield* MigrateErrorContext;
    const errors = exit.cause.reasons.filter(Cause.isFailReason).map((r) => r.error);
    return yield* migrate(data, version.from).pipe(
      Effect.provideService(MigrateErrorContext, [...accumulated, ...errors]),
      Effect.map(version.migrate),
    );
  });

export const toSchema = <From = never, Fields extends AnyFields = AnyFields>(version: Version<From, Fields>) =>
  Schema.Struct(isMigrateVersion(version) ? version.to : version);
