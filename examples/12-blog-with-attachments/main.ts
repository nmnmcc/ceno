/**
 * 12 — Blog with Attachments
 *
 * A blog CMS that stores articles as typed documents, attaches cover
 * images, queries posts by tag with MapReduce views, and evolves the
 * article schema over time.
 *
 *   yarn start
 */

import { Database, DesignDocument, Document, SchemaDocument, Version } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Layer, Redacted, Schema, Stream } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const CenoLayer = CouchDB.layer.pipe(
  Layer.provide(
    Client.layer({
      url: process.env["COUCHDB_URL"] ?? "http://localhost:5984",
      username: process.env["COUCHDB_USER"] ?? "admin",
      password: Redacted.make(process.env["COUCHDB_PASSWORD"] ?? "admin"),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

// --- Schema evolution ---

// V1: minimal blog post
const ArticleV1 = Version.version({
  title: Schema.String,
  body: Schema.String,
  author: Schema.String,
  tags: Schema.Array(Schema.String),
  publishedAt: Schema.String,
});

// V2: add summary and reading time (auto-populated for v1 docs)
const ArticleV2 = Version.version({
  from: ArticleV1,
  to: {
    title: Schema.String,
    body: Schema.String,
    author: Schema.String,
    tags: Schema.Array(Schema.String),
    publishedAt: Schema.String,
    summary: Schema.String,
    readingTimeMinutes: Schema.Number,
  },
  migrate: (v1) => ({
    ...v1,
    summary: v1.body.slice(0, 120) + "...",
    readingTimeMinutes: Math.ceil(v1.body.split(/\s+/).length / 200),
  }),
});

const program = Effect.gen(function* () {
  const database = yield* Database.Database;
  const document = yield* Document.Document;
  const ddoc = yield* DesignDocument.DesignDocument;
  const db = "example-blog";
  yield* database.create(db);

  const docs = document.in(db);

  // --- Create a design document with views for querying posts ---

  yield* docs.put("_design/blog", {
    views: {
      by_tag: {
        map: `function(doc) {
          if (doc.tags) {
            doc.tags.forEach(function(tag) { emit(tag, 1); });
          }
        }`,
        reduce: "_count",
      },
      by_date: {
        map: `function(doc) {
          if (doc.publishedAt) emit(doc.publishedAt, null);
        }`,
      },
    },
  });

  // --- Seed some blog posts ---

  const articles = yield* SchemaDocument.make(ArticleV2);
  const blog = articles.in(db);

  yield* blog.put("post-effect-intro", {
    title: "Getting Started with Effect",
    body: "Effect is a powerful TypeScript library for building robust applications. It provides structured concurrency, typed errors, dependency injection via services and layers, and a rich ecosystem of combinators. In this article, we explore the core concepts that make Effect stand out from traditional approaches.",
    author: "Alice",
    tags: ["effect", "typescript", "tutorial"],
    publishedAt: "2025-03-15",
    summary: "A beginner-friendly introduction to Effect for TypeScript developers.",
    readingTimeMinutes: 8,
  });

  yield* blog.put("post-couchdb-guide", {
    title: "CouchDB for Modern Apps",
    body: "CouchDB is a document database that uses JSON for documents, HTTP for its API, and JavaScript for MapReduce queries. Its built-in replication makes it ideal for offline-first and distributed applications. We will walk through setting up a CouchDB instance, designing documents, and leveraging views for efficient queries.",
    author: "Bob",
    tags: ["couchdb", "database", "tutorial"],
    publishedAt: "2025-04-01",
    summary: "A practical guide to building modern apps with CouchDB.",
    readingTimeMinutes: 12,
  });

  // Simulate a legacy v1 post written by an older app version
  yield* docs.put("post-legacy", {
    title: "Why NoSQL?",
    body: "NoSQL databases have evolved from niche tools to mainstream choices. They offer flexibility in schema design, horizontal scalability, and models that match how modern applications actually use data. Document stores, key-value stores, and graph databases each solve different problems.",
    author: "Charlie",
    tags: ["database", "nosql"],
    publishedAt: "2024-12-20",
  });

  // --- Attach a cover image to a post ---

  const coverImage = new TextEncoder().encode("PNG_PLACEHOLDER_DATA_" + "x".repeat(100));
  const postDoc = yield* docs.get("post-effect-intro");
  const rev = (postDoc as { _rev: string })._rev;

  const attachResult = yield* docs.attachmentInsert("post-effect-intro", "cover.png", coverImage, { rev });
  console.log("Attached cover image, new rev:", attachResult.rev);

  // Check if the attachment exists
  const hasCover = yield* docs.attachmentExists("post-effect-intro", "cover.png");
  console.log("Has cover image:", hasCover);

  // Download the attachment
  const stream = yield* docs.attachmentGet("post-effect-intro", "cover.png");
  const chunks = yield* Stream.runCollect(stream);
  const downloadedSize = [...chunks].reduce((sum, c) => sum + c.length, 0);
  console.log("Downloaded cover image:", downloadedSize, "bytes");

  // --- Query posts by tag using the MapReduce view ---

  // Count posts per tag (reduce = _count)
  const tagCounts = yield* ddoc.view(db, "blog", "by_tag", {
    group: true,
    reduce: true,
  });
  console.log("\nPosts per tag:");
  for (const row of tagCounts.rows) {
    console.log(`  #${String(row.key)}: ${String(row.value)} post(s)`);
  }

  // Find all posts tagged "tutorial" (disable reduce to get individual rows)
  const tutorials = yield* ddoc.view(db, "blog", "by_tag", {
    key: "tutorial",
    reduce: false,
  });
  console.log("\nTutorial posts:");
  for (const row of tutorials.rows) {
    console.log(`  ${row.id}`);
  }

  // List posts by date (newest first)
  const timeline = yield* ddoc.view(db, "blog", "by_date", {
    descending: true,
  });
  console.log("\nTimeline:");
  for (const row of timeline.rows) {
    console.log(`  ${String(row.key)} — ${row.id}`);
  }

  // --- Read a legacy post through the v2 lens — auto-migrates ---

  const legacyPost = yield* blog.get("post-legacy");
  console.log("\nLegacy post migrated to v2:");
  console.log(`  "${legacyPost.title}" by ${legacyPost.author}`);
  console.log(`  Summary: ${legacyPost.summary}`);
  console.log(`  Reading time: ~${legacyPost.readingTimeMinutes} min`);

  // --- Clean up the cover image ---

  const postAfterAttach = yield* docs.get("post-effect-intro");
  const currentRev = (postAfterAttach as { _rev: string })._rev;
  yield* docs.attachmentDestroy("post-effect-intro", "cover.png", currentRev);
  const hasCoverAfter = yield* docs.attachmentExists("post-effect-intro", "cover.png");
  console.log("\nCover after delete:", hasCoverAfter);

  yield* database.destroy(db);
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
