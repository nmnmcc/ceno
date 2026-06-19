import { isMigrateVersion, migrate, toSchema, version } from "@ceno/core";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect, Schema } from "effect";

const V1 = version({ name: Schema.String });

const V2 = version({
  from: V1,
  to: { name: Schema.String, age: Schema.Number },
  migrate: (v1) => ({ name: v1.name, age: 0 }),
});

const V3 = version({
  from: V2,
  to: { name: Schema.String, age: Schema.Number, active: Schema.Boolean },
  migrate: (v2) => ({ ...v2, active: true }),
});

describe("isMigrateVersion", () => {
  it.effect("returns false for initial schema fields", () =>
    Effect.gen(function* () {
      strictEqual(isMigrateVersion(V1), false);
    }),
  );

  it.effect("returns true for a migration version", () =>
    Effect.gen(function* () {
      strictEqual(isMigrateVersion(V2), true);
      strictEqual(isMigrateVersion(V3), true);
    }),
  );
});

describe("toSchema", () => {
  it.effect("extracts Schema.Struct from initial fields", () =>
    Effect.gen(function* () {
      const schema = toSchema(V1);
      const result = yield* Schema.decodeUnknownEffect(schema)({ name: "Alice" });
      strictEqual(result.name, "Alice");
    }),
  );

  it.effect("extracts Schema.Struct from migration version", () =>
    Effect.gen(function* () {
      const schema = toSchema(V2);
      const result = yield* Schema.decodeUnknownEffect(schema)({ name: "Bob", age: 30 });
      strictEqual(result.name, "Bob");
      strictEqual(result.age, 30);
    }),
  );
});

describe("migrate", () => {
  it.effect("decodes data matching the initial version directly", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice" }, V1);
      strictEqual(result.name, "Alice");
    }),
  );

  it.effect("decodes data matching the latest version in a chain", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice", age: 30 }, V2);
      strictEqual(result.name, "Alice");
      strictEqual(result.age, 30);
    }),
  );

  it.effect("migrates data from v1 through v2 when v2 decode fails", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice" }, V2);
      strictEqual(result.name, "Alice");
      strictEqual(result.age, 0);
    }),
  );

  it.effect("migrates data from v1 through v2 and v3", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice" }, V3);
      strictEqual(result.name, "Alice");
      strictEqual(result.age, 0);
      strictEqual(result.active, true);
    }),
  );

  it.effect("migrates data from v2 through v3", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice", age: 25 }, V3);
      strictEqual(result.name, "Alice");
      strictEqual(result.age, 25);
      strictEqual(result.active, true);
    }),
  );

  it.effect("decodes data matching v3 directly without migration", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice", age: 25, active: false }, V3);
      strictEqual(result.name, "Alice");
      strictEqual(result.age, 25);
      strictEqual(result.active, false);
    }),
  );

  it.effect("fails with MigrateError when no version matches", () =>
    Effect.gen(function* () {
      yield* migrate({ unrelated: "data" }, V1).pipe(
        Effect.andThen(Effect.die("Expected MigrateError")),
        Effect.catchTag("MigrateError", (err: { readonly errors: readonly unknown[] }) => {
          strictEqual(err.errors.length > 0, true);
          return Effect.void;
        }),
      );
    }),
  );

  it.effect("accumulates errors from all failed versions in a chain", () =>
    Effect.gen(function* () {
      yield* migrate({ unrelated: 42 }, V3).pipe(
        Effect.andThen(Effect.die("Expected MigrateError")),
        Effect.catchTag("MigrateError", (err: { readonly errors: readonly unknown[] }) => {
          strictEqual(err.errors.length, 3);
          return Effect.void;
        }),
      );
    }),
  );

  it.effect("strips extra properties during decode", () =>
    Effect.gen(function* () {
      const result = yield* migrate({ name: "Alice", extra: "ignored" }, V1);
      strictEqual(result.name, "Alice");
      strictEqual("extra" in result, false);
    }),
  );

  it.effect("applies custom migration logic", () =>
    Effect.gen(function* () {
      const VersionWithTransform = version({
        from: V1,
        to: { fullName: Schema.String },
        migrate: (v1) => ({ fullName: `Dr. ${v1.name}` }),
      });
      const result = yield* migrate({ name: "Smith" }, VersionWithTransform);
      strictEqual(result.fullName, "Dr. Smith");
    }),
  );
});
