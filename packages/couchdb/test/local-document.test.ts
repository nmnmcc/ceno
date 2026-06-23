import { Document } from "@ceno/core/Document";
import { LocalDocument } from "@ceno/core/LocalDocument";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect } from "effect";

import { TestLayer, withTempDb } from "./helpers";

describe("LocalDocument", () => {
  // ─── Insert ───

  it.effect("insert creates a local document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        const result = yield* local.insert(name, "config", { setting: "value" });
        strictEqual(result.ok, true);
        strictEqual(result.id, "_local/config");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("insert overwrites local document with correct rev", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        const created = yield* local.insert(name, "config", { v: 1 });
        const updated = yield* local.insert(name, "config", { v: 2 }, { rev: created.rev });
        const result = yield* local.get(name, "config");
        strictEqual((result as { v: number }).v, 2);
        strictEqual(updated.id, "_local/config");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("insert without rev on existing document overwrites it", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "overwrite-test", { v: 1 });
        yield* local.insert(name, "overwrite-test", { v: 2 });
        const result = yield* local.get(name, "overwrite-test");
        strictEqual((result as { v: number }).v, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Get ───

  it.effect("get retrieves a local document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "config", { setting: "value" });
        const result = yield* local.get(name, "config");
        strictEqual((result as { _id: string })._id, "_local/config");
        strictEqual((result as { setting: string }).setting, "value");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get returns CenoNotFound for missing local document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.get(name, "missing").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get retrieves latest version after update", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        const v1 = yield* local.insert(name, "evolve", { step: 1 });
        yield* local.insert(name, "evolve", { step: 2 }, { rev: v1.rev });
        const result = yield* local.get(name, "evolve");
        strictEqual((result as { step: number }).step, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Destroy ───

  it.effect("destroy deletes a local document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        const created = yield* local.insert(name, "config", { setting: "value" });
        const result = yield* local.destroy(name, "config", created.rev);
        strictEqual(result.ok, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("destroy succeeds with any rev for local documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        const v1 = yield* local.insert(name, "stale-doc", { v: 1 });
        yield* local.insert(name, "stale-doc", { v: 2 }, { rev: v1.rev });
        const result = yield* local.destroy(name, "stale-doc", v1.rev);
        strictEqual(result.ok, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get returns CenoNotFound after destroy", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        const created = yield* local.insert(name, "temp", { x: 1 });
        yield* local.destroy(name, "temp", created.rev);
        yield* local.get(name, "temp").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── List ───

  it.effect("list returns local documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "cfg1", { a: 1 });
        yield* local.insert(name, "cfg2", { b: 2 });
        const result = yield* local.list(name);
        strictEqual(result.rows.length >= 2, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("list includes _local/ prefix in document IDs", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "myconfig", { x: 1 });
        const result = yield* local.list(name);
        const found = result.rows.find((r) => r.id === "_local/myconfig");
        strictEqual(found !== undefined, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Fetch ───

  it.effect("fetch retrieves specific local documents by keys", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "a", { x: 1 });
        yield* local.insert(name, "b", { x: 2 });
        const result = yield* local.fetch(name, { keys: ["_local/a", "_local/b"] });
        strictEqual(result.rows.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("fetch returns error entries for missing keys", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "real", { x: 1 });
        const result = yield* local.fetch(name, { keys: ["_local/real", "_local/fake"] });
        strictEqual(result.rows.length, 2);
        const fakeRow = result.rows.find((r) => "error" in r);
        strictEqual(fakeRow !== undefined, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Local documents are not replicated ───

  it.effect("local documents do not appear in _all_docs", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(name, "invisible", { x: 1 });
        const doc = yield* Document;
        const result = yield* doc.list(name);
        const found = result.rows.find((r) => r.id?.includes("invisible"));
        strictEqual(found, undefined);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );
});
