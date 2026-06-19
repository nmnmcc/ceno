import { Cause, Context, Data, Effect, Exit, Schema } from "effect";

export type AnyStruct = Schema.Schema<any> & Schema.Struct<Schema.Struct.Fields>;

export type InitialVersion<S extends AnyStruct = AnyStruct> = S;

export type MigrateVersion<F extends Version<any> = never, S extends AnyStruct = AnyStruct> = {
  readonly from: F;
  readonly to: S;
  readonly migrate: (
    from: F extends InitialVersion ? F["Type"] : F extends MigrateVersion ? F["to"]["Type"] : never,
  ) => S["Type"];
};

export type Version<F extends Version<any> = never, S extends AnyStruct = AnyStruct> =
  | InitialVersion<S>
  | MigrateVersion<F, S>;

/** Accumulated decode errors from each version attempted during migration. */
export class MigrateError extends Data.TaggedError("MigrateError")<{
  readonly errors: readonly Schema.SchemaError[];
}> {}

const MigrateErrorContext = Context.Reference<readonly Schema.SchemaError[]>("@ceno/schema/MigrateContext", {
  defaultValue: () => [],
});

export const version = <F extends Version<any> = never, S extends AnyStruct = AnyStruct>(version: Version<F, S>) =>
  version;

/** Decodes unknown data through a version chain, trying the newest schema first and falling back through migrations. */
export const migrate = <F extends Version<any> = never, S extends AnyStruct = AnyStruct>(
  data: unknown,
  version: Version<F, S>,
): Effect.Effect<S["Type"], MigrateError, S["DecodingServices"]> =>
  Effect.gen(function* () {
    if (Schema.isSchema(version)) {
      const exit = yield* Schema.decodeUnknownEffect(version)(data).pipe(Effect.exit);
      if (Exit.isSuccess(exit)) return exit.value;

      const accumulated = yield* MigrateErrorContext;
      const errors = exit.cause.reasons.filter(Cause.isFailReason).map((r) => r.error);
      return yield* new MigrateError({ errors: [...accumulated, ...errors] });
    }

    const exit = yield* Schema.decodeUnknownEffect(version.to)(data).pipe(Effect.exit);
    if (Exit.isSuccess(exit)) return exit.value;

    const accumulated = yield* MigrateErrorContext;
    const errors = exit.cause.reasons.filter(Cause.isFailReason).map((r) => r.error);
    return yield* migrate(data, version.from).pipe(
      Effect.provideService(MigrateErrorContext, [...accumulated, ...errors]),
      Effect.map(version.migrate),
    );
  });
