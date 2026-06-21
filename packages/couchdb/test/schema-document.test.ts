import { Document, LocalDocument } from "@ceno/core";
import { SchemaDocument, SchemaLocalDocument, version } from "@ceno/schema";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect, Schema } from "effect";

import { TestLayer, withTempDb } from "./helpers";

const V1 = version({ title: Schema.String });

const V2 = version({
  from: V1,
  to: { title: Schema.String, priority: Schema.Number },
  migrate: (v1) => ({ title: v1.title, priority: 0 }),
});

describe("SchemaDocument", () => {
  describe("multi-db variant (without db param)", () => {
    it.effect("put encodes and get migrates a v2 document", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = yield* SchemaDocument.make(V2);
          const created = yield* docs.put(db, "item1", { title: "Test", priority: 5 });
          strictEqual(created.ok, true);
          strictEqual(created.id, "item1");

          const fetched = yield* docs.get(db, "item1");
          strictEqual(fetched.title, "Test");
          strictEqual(fetched.priority, 5);
          strictEqual(fetched._id, "item1");
          strictEqual(typeof fetched._rev, "string");
        }),
      ).pipe(Effect.provide(TestLayer)),
    );

    it.effect("get migrates v1 data to v2 schema", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const doc = yield* Document;
          yield* doc.put(db, "old-item", { title: "Legacy" });

          const docs = yield* SchemaDocument.make(V2);
          const fetched = yield* docs.get(db, "old-item");
          strictEqual(fetched.title, "Legacy");
          strictEqual(fetched.priority, 0);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );

    it.effect("insert encodes a document with server-generated ID", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = yield* SchemaDocument.make(V2);
          const result = yield* docs.insert(db, { title: "Auto", priority: 3 });
          strictEqual(result.ok, true);
          strictEqual(typeof result.id, "string");

          const fetched = yield* docs.get(db, result.id);
          strictEqual(fetched.title, "Auto");
          strictEqual(fetched.priority, 3);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );

    it.effect("find migrates query results through the version chain", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const doc = yield* Document;
          yield* doc.put(db, "d1", { title: "Alpha" });
          yield* doc.put(db, "d2", { title: "Beta", priority: 7 });

          const docs = yield* SchemaDocument.make(V2);
          const result = yield* docs.find(db, { selector: { title: "Alpha" } });
          strictEqual(result.docs.length, 1);
          strictEqual(result.docs[0]!.title, "Alpha");
          strictEqual(result.docs[0]!.priority, 0);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );

    it.effect("bulk encodes multiple documents", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = yield* SchemaDocument.make(V2);
          const results = yield* docs.bulk(db, [
            { title: "One", priority: 1 },
            { title: "Two", priority: 2 },
          ]);
          strictEqual(results.length, 2);
          strictEqual(results[0]!.ok, true);
          strictEqual(results[1]!.ok, true);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("single-db variant (via .in)", () => {
    it.effect("put and get work without explicit db argument", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = (yield* SchemaDocument.make(V2)).in(db);
          yield* docs.put("scoped1", { title: "Scoped", priority: 10 });

          const fetched = yield* docs.get("scoped1");
          strictEqual(fetched.title, "Scoped");
          strictEqual(fetched.priority, 10);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );

    it.effect("insert and find work without explicit db argument", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = (yield* SchemaDocument.make(V2)).in(db);
          yield* docs.insert({ title: "Findable", priority: 42 });

          const result = yield* docs.find({ selector: { title: "Findable" } });
          strictEqual(result.docs.length, 1);
          strictEqual(result.docs[0]!.priority, 42);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );

    it.effect("bulk works without explicit db argument", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = (yield* SchemaDocument.make(V2)).in(db);
          const results = yield* docs.bulk([
            { title: "A", priority: 1 },
            { title: "B", priority: 2 },
          ]);
          strictEqual(results.length, 2);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("migration with three-step chain", () => {
    const V3 = version({
      from: V2,
      to: { title: Schema.String, priority: Schema.Number, tags: Schema.Array(Schema.String) },
      migrate: (v2) => ({ ...v2, tags: [] as readonly string[] }),
    });

    it.effect("migrates v1 data all the way to v3", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const doc = yield* Document;
          yield* doc.put(db, "ancient", { title: "Ancient" });

          const docs = yield* SchemaDocument.make(V3);
          const fetched = yield* docs.get(db, "ancient");
          strictEqual(fetched.title, "Ancient");
          strictEqual(fetched.priority, 0);
          strictEqual(fetched.tags.length, 0);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );
  });
});

describe("SchemaLocalDocument", () => {
  it.effect("insert encodes and get migrates a local document", () =>
    withTempDb((db) =>
      Effect.gen(function* () {
        const docs = yield* SchemaLocalDocument.make(V2);
        const created = yield* docs.insert(db, "config", { title: "Config", priority: 1 });
        strictEqual(created.ok, true);

        const fetched = yield* docs.get(db, "config");
        strictEqual(fetched.title, "Config");
        strictEqual(fetched.priority, 1);
        strictEqual(fetched._id, "_local/config");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get migrates v1 local document data to v2", () =>
    withTempDb((db) =>
      Effect.gen(function* () {
        const local = yield* LocalDocument;
        yield* local.insert(db, "legacy", { title: "Old" });

        const docs = yield* SchemaLocalDocument.make(V2);
        const fetched = yield* docs.get(db, "legacy");
        strictEqual(fetched.title, "Old");
        strictEqual(fetched.priority, 0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  describe("single-db variant", () => {
    it.effect("insert and get work without explicit db argument", () =>
      withTempDb((db) =>
        Effect.gen(function* () {
          const docs = (yield* SchemaLocalDocument.make(V2)).in(db);
          yield* docs.insert("prefs", { title: "Prefs", priority: 5 });

          const fetched = yield* docs.get("prefs");
          strictEqual(fetched.title, "Prefs");
          strictEqual(fetched.priority, 5);
        }),
      ).pipe(Effect.provide(TestLayer)),
    );
  });

  it.effect("update with revision round-trips correctly", () =>
    withTempDb((db) =>
      Effect.gen(function* () {
        const docs = yield* SchemaLocalDocument.make(V2);
        const created = yield* docs.insert(db, "updatable", { title: "V1", priority: 1 });
        yield* docs.insert(db, "updatable", { title: "V2", priority: 2 }, { rev: created.rev });

        const fetched = yield* docs.get(db, "updatable");
        strictEqual(fetched.title, "V2");
        strictEqual(fetched.priority, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );
});
