import { Database, Document } from "@ceno/core";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect, Stream } from "effect";

import { COUCHDB_PASSWORD, COUCHDB_URL, COUCHDB_USER, TestLayer, uniqueDb, withTempDb } from "./helpers";

describe("Database", () => {
  // ─── CRUD ───

  it.effect("create and destroy a database", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      const name = uniqueDb();
      const created = yield* db.create(name);
      strictEqual(created.ok, true);
      const destroyed = yield* db.destroy(name);
      strictEqual(destroyed.ok, true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("create returns CenoAlreadyExists for duplicate", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        yield* db.create(name).pipe(
          Effect.andThen(Effect.die("Expected CenoAlreadyExists")),
          Effect.catchTag("CenoAlreadyExists", () => Effect.void),
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("create returns CenoIllegalDatabaseName for invalid name", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      yield* db.create("_invalid").pipe(
        Effect.andThen(Effect.die("Expected CenoIllegalDatabaseName")),
        Effect.catchTag("CenoIllegalDatabaseName", () => Effect.void),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info returns database metadata", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const info = yield* db.info(name);
        strictEqual(info.db_name, name);
        strictEqual(info.doc_count, 0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info includes cluster and sizes metadata", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const info = yield* db.info(name);
        strictEqual(typeof info.cluster.n, "number");
        strictEqual(typeof info.cluster.q, "number");
        strictEqual(typeof info.cluster.r, "number");
        strictEqual(typeof info.cluster.w, "number");
        strictEqual(typeof info.sizes.active, "number");
        strictEqual(typeof info.sizes.external, "number");
        strictEqual(typeof info.sizes.file, "number");
        strictEqual(info.compact_running, false);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info returns CenoNotFound for nonexistent database", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      yield* db.info("ceno_nonexistent_db").pipe(
        Effect.andThen(Effect.die("Expected CenoNotFound")),
        Effect.catchTag("CenoNotFound", () => Effect.void),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("exists succeeds for existing database", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const found = yield* db.exists(name);
        strictEqual(found, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("exists returns false for nonexistent database", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      const found = yield* db.exists("ceno_nonexistent_db");
      strictEqual(found, false);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("destroy returns CenoNotFound for nonexistent database", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      yield* db.destroy("ceno_nonexistent_db").pipe(
        Effect.andThen(Effect.die("Expected CenoNotFound")),
        Effect.catchTag("CenoNotFound", () => Effect.void),
      );
    }).pipe(Effect.provide(TestLayer)),
  );

  // ─── Listing ───

  it.effect("list includes created database", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const names = yield* db.list();
        strictEqual(names.includes(name), true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("list returns an array of strings", () =>
    withTempDb((_name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const names = yield* db.list();
        strictEqual(Array.isArray(names), true);
        strictEqual(
          names.every((n) => typeof n === "string"),
          true,
        );
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info returns metadata for specific databases", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = yield* db.info([name]);
        strictEqual(result.length, 1);
        strictEqual(result[0]!.key, name);
        strictEqual(result[0]!.info !== null, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("info returns metadata for multiple databases", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      const name1 = uniqueDb();
      const name2 = uniqueDb();
      yield* db.create(name1);
      yield* db.create(name2);
      const result = yield* db.info([name1, name2]);
      strictEqual(result.length, 2);
      const keys = result.map((r) => r.key).sort();
      strictEqual(keys[0], [name1, name2].sort()[0]);
      strictEqual(keys[1], [name1, name2].sort()[1]);
      yield* db.destroy(name1).pipe(Effect.ignore);
      yield* db.destroy(name2).pipe(Effect.ignore);
    }).pipe(Effect.provide(TestLayer)),
  );

  // ─── Compaction & cleanup ───

  it.effect("compact returns accepted response", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = yield* db.compact(name);
        strictEqual(result.ok, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("compact with design doc name compacts that index", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "_design/test", {
          views: { by_x: { map: "function(doc) { emit(doc.x, 1); }" } },
        });
        const db = yield* Database;
        const result = yield* db.compact(name, "test");
        strictEqual(result.ok, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("viewCleanup removes stale view indexes", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        yield* db.viewCleanup(name);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Security ───

  it.effect("security.get returns security object", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const security = yield* db.security.get(name);
        strictEqual(typeof security, "object");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("security.set round-trips security object", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const securityDoc = {
          admins: { names: ["admin"], roles: ["_admin"] },
          members: { names: [], roles: [] },
        };
        const setResult = yield* db.security.set(name, securityDoc);
        strictEqual(setResult.ok, true);
        const got = yield* db.security.get(name);
        strictEqual(got.admins?.names?.[0], "admin");
        strictEqual(got.admins?.roles?.[0], "_admin");
        strictEqual(got.members?.names?.length, 0);
        strictEqual(got.members?.roles?.length, 0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Revision limits ───

  it.effect("revs.limit.get returns default revision limit", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const limit = yield* db.revs.limit.get(name);
        strictEqual(limit, 1000);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("revs.limit.set updates the revision limit", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = yield* db.revs.limit.set(name, 500);
        strictEqual(result.ok, true);
        const limit = yield* db.revs.limit.get(name);
        strictEqual(limit, 500);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Purge ───

  it.effect("purge removes specified document revisions", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "to-purge", { x: 1 });
        yield* doc.destroy(name, "to-purge", created.rev);

        const db = yield* Database;
        const result = (yield* db.purge(name, { "to-purge": [created.rev] })) as {
          purge_seq: unknown;
          purged: unknown;
        };
        strictEqual(result.purge_seq !== undefined, true);
        strictEqual(typeof result.purged, "object");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Purged infos limit ───

  it.effect("purgedInfosLimit.get returns default", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const limit = yield* db.purgedInfosLimit.get(name);
        strictEqual(typeof limit, "number");
        strictEqual(limit > 0, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("purgedInfosLimit.set updates the limit", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = yield* db.purgedInfosLimit.set(name, 500);
        strictEqual(result.ok, true);
        const limit = yield* db.purgedInfosLimit.get(name);
        strictEqual(limit, 500);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Missing revs & Revs diff ───

  it.effect("revs.missing identifies revisions not in the database", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = (yield* db.revs.missing(name, { "missing-doc": ["1-abc"] })) as {
          missing_revs: Record<string, string[]>;
        };
        strictEqual(typeof result.missing_revs, "object");
        strictEqual(result.missing_revs["missing-doc"]!.length, 1);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("revs.diff returns diff for unknown revisions", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = (yield* db.revs.diff(name, { "unknown-doc": ["1-xyz"] })) as Record<
          string,
          { missing: string[] }
        >;
        strictEqual(result["unknown-doc"]!.missing.length, 1);
        strictEqual(result["unknown-doc"]!.missing[0], "1-xyz");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Changes ───

  it.effect("changes returns empty feed for new database", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = yield* db.changes(name);
        strictEqual(result.results.length, 0);
        strictEqual(result.pending, 0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("changes includes inserted documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "c1", { a: 1 });
        yield* doc.put(name, "c2", { b: 2 });

        const db = yield* Database;
        const result = yield* db.changes(name);
        strictEqual(result.results.length, 2);
        const ids = result.results.map((r) => r.id).sort();
        strictEqual(ids[0], "c1");
        strictEqual(ids[1], "c2");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("changes includes revision info for each change", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "rev-check", { x: 1 });

        const db = yield* Database;
        const result = yield* db.changes(name);
        strictEqual(result.results.length, 1);
        strictEqual(result.results[0]!.changes.length > 0, true);
        strictEqual(typeof result.results[0]!.changes[0]!.rev, "string");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("changes shows deleted flag for destroyed documents", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        const created = yield* doc.put(name, "doomed", { x: 1 });
        yield* doc.destroy(name, "doomed", created.rev);

        const db = yield* Database;
        const result = yield* db.changes(name);
        const deleted = result.results.find((r) => r.id === "doomed" && r.deleted === true);
        strictEqual(deleted !== undefined, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("changes routes to POST when the body carries doc_ids", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "posted", { x: 1 });

        const db = yield* Database;
        const result = yield* db.changes(name, { doc_ids: ["posted"] });
        strictEqual(result.results.length, 1);
        strictEqual(result.results[0]!.id, "posted");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("changes with stream flag returns a stream effect", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "s1", { x: 1 });

        const db = yield* Database;
        const stream = yield* db.changes(name, { stream: true });
        strictEqual(typeof stream, "object");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Replication ───

  it.effect("replicate copies documents between databases", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      const doc = yield* Document;
      const source = uniqueDb();
      const target = uniqueDb();
      yield* db.create(source);
      yield* db.create(target);
      yield* doc.put(source, "rep-doc", { replicated: true });

      const result = yield* db.replicate({
        source: `${COUCHDB_URL.replace("://", `://${COUCHDB_USER}:${COUCHDB_PASSWORD}@`)}/${source}`,
        target: `${COUCHDB_URL.replace("://", `://${COUCHDB_USER}:${COUCHDB_PASSWORD}@`)}/${target}`,
      });
      strictEqual(result.ok, true);
      strictEqual(result.history.length > 0, true);
      strictEqual(result.history[0]!.docs_written > 0, true);

      const fetched = yield* doc.get(target, "rep-doc");
      strictEqual((fetched as { replicated: boolean }).replicated, true);

      yield* db.destroy(source).pipe(Effect.ignore);
      yield* db.destroy(target).pipe(Effect.ignore);
    }).pipe(Effect.provide(TestLayer)),
  );

  // ─── dbsInfo GET ───

  it.effect("dbsInfo returns metadata for all databases", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const result = yield* db.info();
        strictEqual(result.length > 0, true);
        const found = result.find((item) => item.key === name);
        strictEqual(found !== undefined, true);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  // ─── Updates ───

  it.effect("updates returns database event feed", () =>
    Effect.gen(function* () {
      const db = yield* Database;
      yield* db.create("_global_changes").pipe(Effect.ignore);
      const name = uniqueDb();
      yield* db.create(name);
      const result = yield* db.updates();
      strictEqual(typeof result.last_seq, "string");
      strictEqual(Array.isArray(result.results), true);
      yield* db.destroy(name).pipe(Effect.ignore);
    }).pipe(Effect.provide(TestLayer)),
  );

  // ─── changesStream (deep) ───

  it.effect("changes stream yields parsed change items from continuous feed", () =>
    withTempDb((name) =>
      Effect.gen(function* () {
        const doc = yield* Document;
        yield* doc.put(name, "stream-doc", { x: 1 });

        const db = yield* Database;
        const stream = yield* db.changes(name, { feed: "continuous", stream: true });
        const items = yield* stream.pipe(Stream.take(1), Stream.runCollect);
        strictEqual(items.length, 1);
        strictEqual(items[0]!.id, "stream-doc");
        strictEqual(typeof items[0]!.changes[0]!.rev, "string");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );
});
