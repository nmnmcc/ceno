import { Cause, Context, Effect, Exit, Schema } from "effect";
import { MigrateError, type MigrateVersion, type Version } from "../Version.ts";

type AnyFields = Schema.Struct.Fields;

/** @internal */
export const isMigrateVersion = <From = never, Fields extends AnyFields = AnyFields>(
  version: Version<From, Fields>,
): version is MigrateVersion<From, Fields> => typeof version.migrate === "function";

const MigrateErrorContext = Context.Reference<readonly Schema.SchemaError[]>("@ceno/core/MigrateContext", {
  defaultValue: () => [],
});

/** @internal Decodes unknown data through a version chain, trying the newest schema first and falling back through migrations. */
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

/** @internal */
export const toSchema = <From = never, Fields extends AnyFields = AnyFields>(version: Version<From, Fields>) =>
  Schema.Struct(isMigrateVersion(version) ? version.to : version);
