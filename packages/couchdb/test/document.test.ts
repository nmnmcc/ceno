import { Database, DesignDocument, Document } from "@ceno/core";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect, Stream } from "effect";

import { TestLayer, withTempDb, withTempPartitionedDb } from "./helpers";

describe("Document", () => {
  // ─── Insert ───

  it.effect("insert creates a document with server-generated ID", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.insert(name, { title: "Hello" });
        strictEqual(result.ok, true);
        strictEqual(typeof result.id, "string");
        strictEqual(typeof result.rev, "string");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("insert with _id in body uses that ID", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.insert(name, { _id: "explicit-id", title: "Hello" });
        strictEqual(result.ok, true);
        strictEqual(result.id, "explicit-id");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("insert returns CenoConflict on duplicate _id", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.insert(name, { _id: "dup", title: "First" });
        yield* doc.insert(name, { _id: "dup", title: "Second" }).pipe(
          Effect.andThen(Effect.die("Expected CenoConflict")),
          Effect.catchTag("CenoConflict", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Put ───

  it.effect("put creates a document at a specific ID", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.put(name, "mydoc", { title: "Hello" });
        strictEqual(result.ok, true);
        strictEqual(result.id, "mydoc");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("put updates an existing document with correct rev", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "updatable", { title: "v1" });
        const updated = yield* doc.put(name, "updatable", { title: "v2" }, { rev: created.rev });
        strictEqual(updated.ok, true);
        strictEqual(updated.id, "updatable");

        const fetched = yield* doc.get(name, "updatable");
        strictEqual((fetched as { title: string }).title, "v2");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("put returns CenoConflict with stale rev", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "conflict-doc", { title: "v1" });
        yield* doc.put(name, "conflict-doc", { title: "v2" }, { rev: created.rev });
        yield* doc.put(name, "conflict-doc", { title: "v3" }, { rev: created.rev }).pipe(
          Effect.andThen(Effect.die("Expected CenoConflict")),
          Effect.catchTag("CenoConflict", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Get ───

  it.effect("get retrieves a document by ID", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "doc1", { title: "Hello" });
        const result = yield* doc.get(name, "doc1");
        strictEqual((result as { _id: string })._id, "doc1");
        strictEqual((result as { title: string }).title, "Hello");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get returns CenoNotFound for missing document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.get(name, "missing").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get returns _id and _rev fields", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "meta-doc", { x: 1 });
        const result = yield* doc.get(name, "meta-doc");
        strictEqual((result as { _id: string })._id, "meta-doc");
        strictEqual(typeof (result as { _rev: string })._rev, "string");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Head ───

  it.effect("head succeeds for existing document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "doc1", { title: "Hello" });
        yield* doc.head(name, "doc1");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("head fails for missing document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const exit = yield* doc.head(name, "nonexistent").pipe(Effect.exit);
        strictEqual(exit._tag, "Failure");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Destroy ───

  it.effect("destroy deletes a document", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "doc1", { title: "Hello" });
        const result = yield* doc.destroy(name, "doc1", created.rev);
        strictEqual(result.ok, true);
        strictEqual(result.id, "doc1");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("destroy returns CenoConflict with stale revision", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "doc1", { title: "v1" });
        yield* doc.put(name, "doc1", { title: "v2" }, { rev: created.rev });
        yield* doc.destroy(name, "doc1", created.rev).pipe(
          Effect.andThen(Effect.die("Expected CenoConflict")),
          Effect.catchTag("CenoConflict", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("get returns CenoNotFound after document is destroyed", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "gone", { x: 1 });
        yield* doc.destroy(name, "gone", created.rev);
        yield* doc.get(name, "gone").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Bulk ───

  it.effect("bulk inserts multiple documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.bulk(name, [{ title: "A" }, { title: "B" }]);
        strictEqual(result.length, 2);
        strictEqual(result[0]!.ok, true);
        strictEqual(result[1]!.ok, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("bulk with _id inserts at specific IDs", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.bulk(name, [
          { _id: "b1", x: 1 },
          { _id: "b2", x: 2 },
        ]);
        strictEqual(result[0]!.id, "b1");
        strictEqual(result[1]!.id, "b2");

        const fetched = yield* doc.get(name, "b1");
        strictEqual((fetched as { x: number }).x, 1);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("bulk reports per-document errors for conflicts", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "exists", { x: 1 });
        const result = yield* doc.bulk(name, [
          { _id: "exists", x: 2 },
          { _id: "new-doc", x: 3 },
        ]);
        strictEqual(result[0]!.error, "conflict");
        strictEqual(result[1]!.ok, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Bulk Get ───

  it.effect("bulkGet retrieves multiple documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "d1", { a: 1 });
        yield* doc.put(name, "d2", { b: 2 });
        const result = yield* doc.bulkGet(name, [{ id: "d1" }, { id: "d2" }]);
        strictEqual(result.results.length, 2);
        strictEqual(result.results[0]!.id, "d1");
        strictEqual(result.results[1]!.id, "d2");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("bulkGet returns error entries for missing documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "exists", { a: 1 });
        const result = yield* doc.bulkGet(name, [{ id: "exists" }, { id: "missing" }]);
        strictEqual(result.results.length, 2);
        const missingResult = result.results.find((r) => r.id === "missing")!;
        strictEqual("error" in missingResult.docs[0]!, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── All Docs ───

  it.effect("list returns all documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "d1", { a: 1 });
        yield* doc.put(name, "d2", { b: 2 });
        const result = yield* doc.list(name);
        strictEqual(result.total_rows, 2);
        strictEqual(result.rows.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("list rows include id, key, and value with rev", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "d1", { color: "red" });
        const result = yield* doc.list(name);
        strictEqual(result.rows.length, 1);
        strictEqual(result.rows[0]!.id, "d1");
        strictEqual(result.rows[0]!.key, "d1");
        strictEqual(typeof result.rows[0]!.value.rev, "string");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("list on empty database returns zero rows", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.list(name);
        strictEqual(result.total_rows, 0);
        strictEqual(result.rows.length, 0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Fetch ───

  it.effect("fetch retrieves specific documents by keys", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "d1", { a: 1 });
        yield* doc.put(name, "d2", { b: 2 });
        const result = yield* doc.fetch(name, ["d1", "d2"]);
        strictEqual(result.rows.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("fetch returns error rows for missing keys", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "real", { x: 1 });
        const result = yield* doc.fetch(name, ["real", "fake"]);
        strictEqual(result.rows.length, 2);
        const fakeRow = result.rows.find((r) => "error" in r);
        strictEqual(fakeRow !== undefined, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Mango Index ───

  it.effect("createIndex creates a Mango index", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const result = yield* doc.createIndex(name, {
          index: { fields: ["title"] },
          name: "title-index",
          type: "json",
        });
        strictEqual(result.result, "created");
        strictEqual(result.name, "title-index");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("createIndex returns exists for duplicate index", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.createIndex(name, {
          index: { fields: ["title"] },
          name: "title-idx",
          type: "json",
        });
        const result = yield* doc.createIndex(name, {
          index: { fields: ["title"] },
          name: "title-idx",
          type: "json",
        });
        strictEqual(result.result, "exists");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("listIndexes includes default and custom indexes", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.createIndex(name, {
          index: { fields: ["status"] },
          name: "status-idx",
          type: "json",
        });
        const result = yield* doc.listIndexes(name);
        strictEqual(result.total_rows >= 2, true);
        const statusIdx = result.indexes.find((i) => i.name === "status-idx");
        strictEqual(statusIdx !== undefined, true);
        strictEqual(statusIdx!.type, "json");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("deleteIndex removes a Mango index", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.createIndex(name, {
          index: { fields: ["category"] },
          name: "cat-idx",
          type: "json",
        });
        const result = yield* doc.deleteIndex(name, created.id.replace("_design/", ""), "cat-idx");
        strictEqual(result.ok, true);

        const indexes = yield* doc.listIndexes(name);
        const found = indexes.indexes.find((i) => i.name === "cat-idx");
        strictEqual(found, undefined);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Mango Find ───

  it.effect("find executes a Mango query", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "d1", { title: "Hello" });
        yield* doc.put(name, "d2", { title: "World" });
        const result = yield* doc.find(name, { selector: { title: "Hello" } });
        strictEqual(result.docs.length, 1);
        strictEqual((result.docs[0] as { title: string }).title, "Hello");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("find with limit caps results", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.bulk(name, [
          { _id: "f1", type: "item" },
          { _id: "f2", type: "item" },
          { _id: "f3", type: "item" },
        ]);
        const result = yield* doc.find(name, { selector: { type: "item" }, limit: 2 });
        strictEqual(result.docs.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("find with fields projects only requested fields", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "proj", { title: "A", category: "B", secret: "C" });
        const result = yield* doc.find(name, {
          selector: { title: "A" },
          fields: ["title", "category"],
        });
        strictEqual(result.docs.length, 1);
        const d = result.docs[0] as Record<string, unknown>;
        strictEqual(d["title"], "A");
        strictEqual(d["category"], "B");
        strictEqual("secret" in d, false);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("find with sort orders results", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.createIndex(name, { index: { fields: ["priority"] }, type: "json" });
        yield* doc.bulk(name, [
          { _id: "low", priority: 3 },
          { _id: "high", priority: 1 },
          { _id: "mid", priority: 2 },
        ]);
        const result = yield* doc.find(name, {
          selector: { priority: { $gt: 0 } },
          sort: [{ priority: "asc" }],
        });
        const ids = result.docs.map((d) => (d as { _id: string })._id);
        strictEqual(ids[0], "high");
        strictEqual(ids[1], "mid");
        strictEqual(ids[2], "low");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Explain ───

  it.effect("explain returns query plan without executing", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.createIndex(name, { index: { fields: ["status"] }, name: "status-idx", type: "json" });
        const plan = (yield* doc.explain(name, {
          selector: { status: "active" },
          use_index: "status-idx",
        })) as { index: { name: string } };
        strictEqual(plan.index.name, "status-idx");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Attachments ───

  it.effect("attachment insert and destroy lifecycle", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "att-doc", { title: "With Attachment" });

        const insertResult = yield* doc.attachmentInsert(
          name,
          "att-doc",
          "hello.txt",
          new TextEncoder().encode("Hello, World!"),
          { rev: created.rev },
        );
        strictEqual(insertResult.ok, true);
        strictEqual(insertResult.id, "att-doc");

        yield* doc.attachmentHead(name, "att-doc", "hello.txt");

        const destroyResult = yield* doc.attachmentDestroy(name, "att-doc", "hello.txt", insertResult.rev);
        strictEqual(destroyResult.ok, true);

        const exit = yield* doc.attachmentHead(name, "att-doc", "hello.txt").pipe(Effect.exit);
        strictEqual(exit._tag, "Failure");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Changes integration ───

  it.effect("changes reflects inserted documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const database = yield* Database;
        yield* doc.put(name, "d1", { a: 1 });
        const changes = yield* database.changes(name);
        strictEqual(changes.results.length, 1);
        strictEqual(changes.results[0]!.id, "d1");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Attachment download ───

  it.effect("attachmentGet downloads attachment content as a stream", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "att-doc", { title: "attachment test" });
        yield* doc.attachmentInsert(name, "att-doc", "hello.txt", "hello world", { rev: created.rev });

        const stream = yield* doc.attachmentGet(name, "att-doc", "hello.txt");
        const chunks = yield* Stream.runCollect(stream);
        strictEqual(chunks.length > 0, true);
        const text = new TextDecoder().decode(chunks[0]);
        strictEqual(text.includes("hello world"), true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("attachmentGet returns CenoNotFound for missing attachment", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "att-doc2", { title: "no attachment" });
        yield* doc.attachmentGet(name, "att-doc2", "missing.txt").pipe(
          Effect.andThen(Effect.die("Expected CenoNotFound")),
          Effect.catchTag("CenoNotFound", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Streaming ───

  it.effect("listStream returns a stream of decoded text", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "s1", { x: 1 });
        yield* doc.put(name, "s2", { x: 2 });

        const stream = yield* doc.listStream(name);
        const chunks = yield* Stream.runCollect(stream);
        const body = chunks.join("");
        strictEqual(body.includes("s1"), true);
        strictEqual(body.includes("s2"), true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("findStream returns a stream of decoded text", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "fs1", { type: "item", value: 42 });

        const stream = yield* doc.findStream(name, { selector: { type: "item" } });
        const chunks = yield* Stream.runCollect(stream);
        const body = chunks.join("");
        strictEqual(body.includes("fs1"), true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Partitioned database ───

  it.effect("partitionInfo returns partition metadata", () =>
    withTempPartitionedDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "mypart:doc1", { title: "first" });
        yield* doc.put(name, "mypart:doc2", { title: "second" });

        const info = yield* doc.partitionInfo(name, "mypart");
        strictEqual(info.partition, "mypart");
        strictEqual(info.doc_count, 2);
        strictEqual(info.db_name, name);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("partitionedList returns documents within a partition", () =>
    withTempPartitionedDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "alpha:d1", { x: 1 });
        yield* doc.put(name, "alpha:d2", { x: 2 });
        yield* doc.put(name, "beta:d3", { x: 3 });

        const result = yield* doc.partitionedList(name, "alpha");
        strictEqual(result.rows.length, 2);
        const ids = result.rows.map((r) => r.id).sort();
        strictEqual(ids[0], "alpha:d1");
        strictEqual(ids[1], "alpha:d2");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("partitionedFind queries within a partition", () =>
    withTempPartitionedDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "region:us1", { country: "US", city: "NYC" });
        yield* doc.put(name, "region:us2", { country: "US", city: "LA" });
        yield* doc.put(name, "region:eu1", { country: "DE", city: "Berlin" });

        const result = yield* doc.partitionedFind(name, "region", {
          selector: { country: "US" },
        });
        strictEqual(result.docs.length, 2);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("partitionedView queries a view within a partition", () =>
    withTempPartitionedDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "_design/test", {
          views: { by_city: { map: "function(doc) { if (doc.city) emit(doc.city, 1); }" } },
          options: { partitioned: true },
        });
        yield* doc.put(name, "zone:a1", { city: "Paris" });
        yield* doc.put(name, "zone:a2", { city: "London" });
        yield* doc.put(name, "other:b1", { city: "Tokyo" });

        const ddoc = yield* DesignDocument;
        const result = yield* ddoc.partitionedView(name, "zone", "test", "by_city");
        strictEqual(result.rows.length, 2);
        const keys = result.rows.map((r) => r.key).sort();
        strictEqual(keys[0], "London");
        strictEqual(keys[1], "Paris");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );
});
