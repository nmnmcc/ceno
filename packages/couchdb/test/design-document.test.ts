import { DesignDocument } from "@ceno/core/DesignDocument";
import { Document } from "@ceno/core/Document";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect, Stream } from "effect";

import { TestLayer, withTempDb } from "./helpers";

const setupDesignDoc = (db: string) =>
  Effect.gen(function* () {
    const doc = yield* Document;
    yield* doc.put(db, "_design/test", {
      views: {
        by_title: {
          map: "function(doc) { if (doc.title) emit(doc.title, 1); }",
        },
      },
    });
    yield* doc.put(db, "doc1", { title: "alpha" });
    yield* doc.put(db, "doc2", { title: "beta" });
  });

describe("DesignDocument", () => {
  // ─── Info ───

  it.effect("info returns design document metadata", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.info(name, "test");
        strictEqual(result.name, "test");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info includes view_index metadata", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.info(name, "test");
        strictEqual(typeof result.view_index.signature, "string");
        strictEqual(typeof result.view_index.language, "string");
        strictEqual(typeof result.view_index.compact_running, "boolean");
        strictEqual(typeof result.view_index.sizes.active, "number");
        strictEqual(typeof result.view_index.sizes.file, "number");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info returns CenoNotFound for missing design document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const ddoc = yield* DesignDocument;
        yield* ddoc.info(name, "nonexistent").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── View (GET) ───

  it.effect("view returns all emitted rows", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.view(name, "test", "by_title");
        strictEqual(result.total_rows, 2);
        strictEqual(result.rows.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("view rows contain id, key, and value", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.view(name, "test", "by_title");
        const keys = result.rows.map((r) => r.key).sort();
        strictEqual(keys[0], "alpha");
        strictEqual(keys[1], "beta");
        strictEqual(result.rows[0]!.value, 1);
        strictEqual(typeof result.rows[0]!.id, "string");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("view returns CenoNotFound for missing view", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        yield* ddoc.view(name, "test", "nonexistent").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("view returns CenoNotFound for missing design document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const ddoc = yield* DesignDocument;
        yield* ddoc.view(name, "nonexistent", "some_view").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── View (POST) ───

  it.effect("view (POST) returns view results filtered by keys", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.viewPost(name, "test", "by_title", { keys: ["alpha"] });
        strictEqual(result.rows.length, 1);
        strictEqual(result.rows[0]!.key, "alpha");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("view (POST) with multiple keys returns matching rows", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.viewPost(name, "test", "by_title", { keys: ["alpha", "beta"] });
        strictEqual(result.rows.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("view (POST) with nonexistent key returns no rows", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.viewPost(name, "test", "by_title", { keys: ["nonexistent"] });
        strictEqual(result.rows.length, 0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Lifecycle: views update as documents change ───

  it.effect("view reflects newly inserted documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const doc = yield* Document;
        const ddoc = yield* DesignDocument;

        const before = yield* ddoc.view(name, "test", "by_title");
        strictEqual(before.total_rows, 2);

        yield* doc.put(name, "doc3", { title: "gamma" });
        const after = yield* ddoc.view(name, "test", "by_title");
        strictEqual(after.total_rows, 3);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("view reflects deleted documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const doc = yield* Document;
        const ddoc = yield* DesignDocument;

        const d1 = yield* doc.get(name, "doc1");
        yield* doc.destroy(name, "doc1", (d1 as { _rev: string })._rev);

        const after = yield* ddoc.view(name, "test", "by_title");
        strictEqual(after.total_rows, 1);
        strictEqual(after.rows[0]!.key, "beta");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── View stream ───

  it.effect("view with stream returns decoded text stream of view results", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        yield* setupDesignDoc(name);
        const ddoc = yield* DesignDocument;
        const stream = yield* ddoc.viewStream(name, "test", "by_title");
        const chunks = yield* Stream.runCollect(stream);
        const body = chunks.join("");
        strictEqual(body.includes("alpha"), true);
        strictEqual(body.includes("beta"), true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Show function (deprecated but functional) ───

  it.effect("render.show renders a document through a show function", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "_design/showtest", {
          shows: {
            simple:
              'function(doc, req) { return { body: JSON.stringify({ title: doc.title, shown: true }), headers: { "Content-Type": "application/json" } }; }',
          },
        });
        yield* doc.put(name, "mydoc", { title: "Hello" });

        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.show(name, "showtest", "simple", "mydoc");
        strictEqual((result as { title: string }).title, "Hello");
        strictEqual((result as { shown: boolean }).shown, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Update handler (deprecated but functional) ───

  it.effect("render.update applies a server-side update function", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "_design/upd", {
          updates: {
            stamp:
              'function(doc, req) { doc.stamped = true; return [doc, { body: JSON.stringify({ ok: true }), headers: { "Content-Type": "application/json" } }]; }',
          },
        });
        yield* doc.put(name, "target", { value: 1 });

        const ddoc = yield* DesignDocument;
        yield* ddoc.updateHandler(name, "upd", "stamp", "target", {});

        const updated = yield* doc.get(name, "target");
        strictEqual((updated as { stamped: boolean }).stamped, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── List function (deprecated but functional) ───

  it.effect("render.list applies a list function to view results", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "_design/listtest", {
          views: {
            all: { map: "function(doc) { if (doc.title) emit(doc.title, 1); }" },
          },
          lists: {
            asJson:
              'function(head, req) { var rows = []; var row; while (row = getRow()) { rows.push(row.key); } start({ headers: { "Content-Type": "application/json" } }); send(JSON.stringify({ items: rows })); }',
          },
        });
        yield* doc.put(name, "l1", { title: "apple" });
        yield* doc.put(name, "l2", { title: "banana" });

        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.viewWithList(name, "listtest", "asJson", "all");
        const items = ((result as { items: string[] }).items ?? []).sort();
        strictEqual(items.length, 2);
        strictEqual(items[0], "apple");
        strictEqual(items[1], "banana");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );
});
