import {
  DatabaseChangesResponse,
  DatabaseChangesResultItem,
  DatabaseGetResponse,
  DatabaseReplicateResponse,
  DatabaseUpdatesResponse,
  DbsInfoResponse,
  OkResponse,
  PurgeResponse,
  SecurityObject,
} from "@ceno/core/Database";
import {
  DesignDocumentInfoResponse,
  DesignDocumentSearchResponse,
  DesignDocumentViewResponse,
} from "@ceno/core/DesignDocument";
import {
  BulkGetResponse,
  CreateIndexResponse,
  DocumentBulkResponse,
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListResponse,
  IndexListResponse,
  MangoResponse,
  PartitionInfoResponse,
} from "@ceno/core/Document";
import { DatabaseAuthResponse, DatabaseSessionResponse, InfoResponse, UUIDObject } from "@ceno/core/Server";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Schema } from "effect";

// Each test exercises a specific CouchDB-documented wire shape that the live
// single-node test server cannot produce (no search plugin, always reports
// git_sha/uuid, processes DELETEs synchronously, etc.).
//
// decodeUnknownSync THROWS when the schema is STRICTER than the wire payload,
// so an over-strict schema fails right here — making these the only falsifying
// tests for those alignment decisions.

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

describe("Server schema alignment", () => {
  it("InfoResponse decodes when git_sha and uuid are omitted", () => {
    const decoded = Schema.decodeUnknownSync(InfoResponse)({
      couchdb: "Welcome",
      version: "3.3.3",
      features: ["scheduler"],
      vendor: { name: "The Apache Software Foundation" },
    });
    strictEqual(decoded.git_sha, undefined);
    strictEqual(decoded.uuid, undefined);
  });

  it("InfoResponse decodes a full response with all fields present", () => {
    const decoded = Schema.decodeUnknownSync(InfoResponse)({
      couchdb: "Welcome",
      version: "3.3.3",
      git_sha: "abc123",
      uuid: "f0a0b0c0d0e0",
      features: ["scheduler", "search"],
      vendor: { name: "The Apache Software Foundation" },
    });
    strictEqual(decoded.git_sha, "abc123");
    strictEqual(decoded.uuid, "f0a0b0c0d0e0");
  });

  it("UUIDObject decodes", () => {
    const decoded = Schema.decodeUnknownSync(UUIDObject)({
      uuids: ["6e1295ed6c29495e54cc05947f18c8af"],
    });
    strictEqual(decoded.uuids.length, 1);
  });

  it("DatabaseAuthResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseAuthResponse)({
      ok: true,
      name: "admin",
      roles: ["_admin"],
    });
    strictEqual(decoded.ok, true);
    strictEqual(decoded.name, "admin");
  });

  it("DatabaseSessionResponse decodes with authenticated field absent", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseSessionResponse)({
      ok: true,
      userCtx: { name: null, roles: [] },
      info: { authentication_db: "_users", authentication_handlers: ["cookie", "default"] },
    });
    strictEqual(decoded.info.authenticated, undefined);
    strictEqual(decoded.userCtx.name, null);
  });

  it("DatabaseSessionResponse decodes with all info fields present", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseSessionResponse)({
      ok: true,
      userCtx: { name: "admin", roles: ["_admin"] },
      info: { authenticated: "cookie", authentication_db: "_users", authentication_handlers: ["cookie"] },
    });
    strictEqual(decoded.info.authenticated, "cookie");
  });
});

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

describe("Database schema alignment", () => {
  it("OkResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(OkResponse)({ ok: true });
    strictEqual(decoded.ok, true);
  });

  it("DatabaseGetResponse decodes with string purge_seq and update_seq", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseGetResponse)({
      cluster: { n: 3, q: 8, r: 2, w: 2 },
      compact_running: false,
      db_name: "mydb",
      disk_format_version: 8,
      doc_count: 10,
      doc_del_count: 0,
      instance_start_time: "0",
      purge_seq: "0-g1AAAABXeJzLYWBg",
      sizes: { active: 0, external: 0, file: 0 },
      update_seq: "52-g1AAAAFReJzLYWBg",
    });
    strictEqual(decoded.purge_seq, "0-g1AAAABXeJzLYWBg");
    strictEqual(decoded.update_seq, "52-g1AAAAFReJzLYWBg");
  });

  it("DatabaseGetResponse rejects numeric purge_seq (CouchDB 3.x requires string)", () => {
    let threw = false;
    try {
      Schema.decodeUnknownSync(DatabaseGetResponse)({
        cluster: { n: 1, q: 1, r: 1, w: 1 },
        compact_running: false,
        db_name: "mydb",
        disk_format_version: 7,
        doc_count: 0,
        doc_del_count: 0,
        instance_start_time: "0",
        purge_seq: 0,
        sizes: { active: 0, external: 0, file: 0 },
        update_seq: "0",
      });
    } catch {
      threw = true;
    }
    strictEqual(threw, true);
  });

  it("DatabaseGetResponse decodes when props is omitted", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseGetResponse)({
      cluster: { n: 1, q: 1, r: 1, w: 1 },
      compact_running: false,
      db_name: "mydb",
      disk_format_version: 8,
      doc_count: 0,
      doc_del_count: 0,
      instance_start_time: "0",
      purge_seq: "0",
      sizes: { active: 0, external: 0, file: 0 },
      update_seq: "0",
    });
    strictEqual(decoded.props, undefined);
  });

  it("DatabaseGetResponse decodes partitioned database with props", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseGetResponse)({
      cluster: { n: 1, q: 1, r: 1, w: 1 },
      compact_running: false,
      db_name: "mydb",
      disk_format_version: 8,
      doc_count: 0,
      doc_del_count: 0,
      instance_start_time: "0",
      props: { partitioned: true },
      purge_seq: "0",
      sizes: { active: 0, external: 0, file: 0 },
      update_seq: "0",
    });
    strictEqual(decoded.props!.partitioned, true);
  });

  it("DatabaseGetResponse decodes non-partitioned database with empty props", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseGetResponse)({
      cluster: { n: 1, q: 1, r: 1, w: 1 },
      compact_running: false,
      db_name: "mydb",
      disk_format_version: 8,
      doc_count: 0,
      doc_del_count: 0,
      instance_start_time: "0",
      props: {},
      purge_seq: "0",
      sizes: { active: 0, external: 0, file: 0 },
      update_seq: "0",
    });
    strictEqual(decoded.props!.partitioned, undefined);
  });

  it("SecurityObject decodes empty security (never set)", () => {
    const decoded = Schema.decodeUnknownSync(SecurityObject)({});
    strictEqual(decoded.admins, undefined);
    strictEqual(decoded.members, undefined);
  });

  it("SecurityObject decodes fully populated security", () => {
    const decoded = Schema.decodeUnknownSync(SecurityObject)({
      admins: { names: ["admin"], roles: ["_admin"] },
      members: { names: [], roles: [] },
    });
    strictEqual(decoded.admins!.names[0], "admin");
    strictEqual(decoded.members!.roles.length, 0);
  });

  // CouchDB 3.x returns `admins: {}` (no names/roles) for databases with no
  // explicit security. Schema defaults missing names/roles to [] so the Type
  // stays required (matching the docs) while the decode handles absent keys.
  it("SecurityObject defaults names/roles to [] when CouchDB omits them", () => {
    const decoded = Schema.decodeUnknownSync(SecurityObject)({ admins: {}, members: {} });
    strictEqual(decoded.admins!.names.length, 0);
    strictEqual(decoded.admins!.roles.length, 0);
  });

  it("DbsInfoResponse decodes with null info for missing database", () => {
    const decoded = Schema.decodeUnknownSync(DbsInfoResponse)([
      { key: "existing", info: { db_name: "existing" } },
      { key: "missing", info: null },
    ]);
    strictEqual(decoded[0]!.info !== null, true);
    strictEqual(decoded[1]!.info, null);
  });

  it("DatabaseChangesResultItem decodes with deleted flag", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseChangesResultItem)({
      changes: [{ rev: "2-abc" }],
      id: "doc1",
      seq: "5-xyz",
      deleted: true,
    });
    strictEqual(decoded.deleted, true);
  });

  it("DatabaseChangesResultItem decodes with include_docs", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseChangesResultItem)({
      changes: [{ rev: "1-abc" }],
      id: "doc1",
      seq: 3,
      doc: { _id: "doc1", _rev: "1-abc", title: "hello" },
    });
    strictEqual((decoded.doc as { title: string }).title, "hello");
  });

  it("DatabaseChangesResultItem decodes without optional fields", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseChangesResultItem)({
      changes: [{ rev: "1-abc" }],
      id: "doc1",
      seq: "1-xyz",
    });
    strictEqual(decoded.deleted, undefined);
    strictEqual(decoded.doc, undefined);
  });

  it("DatabaseChangesResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseChangesResponse)({
      last_seq: "5-xyz",
      pending: 0,
      results: [],
    });
    strictEqual(decoded.pending, 0);
  });

  it("DatabaseUpdatesResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseUpdatesResponse)({
      results: [{ db_name: "mydb", type: "created", seq: "1-abc" }],
      last_seq: "1-abc",
    });
    strictEqual(decoded.results[0]!.type, "created");
  });

  // CouchDB returns 0 (number) for initial sequences and opaque strings for
  // actual sequences. The _replicate docs say number; GET /{db} docs say string
  // for the same kind of value. Union(Number, String) covers both forms.
  it("DatabaseReplicateResponse decodes with string sequences (CouchDB 3.x opaque IDs)", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseReplicateResponse)({
      ok: true,
      session_id: "sess-1",
      source_last_seq: "10-g1AAAABXeJzL",
      replication_id_version: 4,
      history: [
        {
          doc_write_failures: 0,
          docs_read: 5,
          docs_written: 5,
          bulk_get_attempts: 5,
          bulk_get_docs: 5,
          end_last_seq: "10-g1AAAABXeJzL",
          end_time: "2024-01-01T00:00:00Z",
          missing_checked: 5,
          missing_found: 5,
          recorded_seq: "10-g1AAAABXeJzL",
          session_id: "sess-1",
          start_last_seq: "0",
          start_time: "2024-01-01T00:00:00Z",
        },
      ],
    });
    strictEqual(decoded.ok, true);
    strictEqual(decoded.source_last_seq, "10-g1AAAABXeJzL");
    strictEqual(decoded.history[0]!.docs_written, 5);
  });

  it("DatabaseReplicateResponse decodes with numeric sequences (CouchDB initial state)", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseReplicateResponse)({
      ok: true,
      session_id: "sess-1",
      source_last_seq: "5-abc",
      replication_id_version: 4,
      history: [
        {
          doc_write_failures: 0,
          docs_read: 5,
          docs_written: 5,
          end_last_seq: "5-abc",
          end_time: "2024-01-01T00:00:00Z",
          missing_checked: 5,
          missing_found: 5,
          recorded_seq: "5-abc",
          session_id: "sess-1",
          start_last_seq: 0,
          start_time: "2024-01-01T00:00:00Z",
        },
      ],
    });
    strictEqual(decoded.history[0]!.start_last_seq, 0);
  });

  it("PurgeResponse decodes with null purge_seq", () => {
    const decoded = Schema.decodeUnknownSync(PurgeResponse)({
      purge_seq: null,
      purged: { "doc-id": ["3-abc", "2-def"] },
    });
    strictEqual(decoded.purge_seq, null);
    strictEqual(decoded.purged["doc-id"]![0], "3-abc");
  });

  it("PurgeResponse decodes with string purge_seq", () => {
    const decoded = Schema.decodeUnknownSync(PurgeResponse)({
      purge_seq: "1-abc",
      purged: {},
    });
    strictEqual(decoded.purge_seq, "1-abc");
  });

  it("DatabaseReplicateResponse decodes when bulk_get_attempts/bulk_get_docs are omitted (older CouchDB)", () => {
    const decoded = Schema.decodeUnknownSync(DatabaseReplicateResponse)({
      ok: true,
      session_id: "sess-1",
      source_last_seq: 0,
      replication_id_version: 4,
      history: [
        {
          doc_write_failures: 0,
          docs_read: 0,
          docs_written: 0,
          end_last_seq: 0,
          end_time: "2024-01-01T00:00:00Z",
          missing_checked: 0,
          missing_found: 0,
          recorded_seq: 0,
          session_id: "sess-1",
          start_last_seq: 0,
          start_time: "2024-01-01T00:00:00Z",
        },
      ],
    });
    strictEqual(decoded.history[0]!.bulk_get_attempts, undefined);
    strictEqual(decoded.history[0]!.bulk_get_docs, undefined);
  });
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

describe("Document schema alignment", () => {
  it("DocumentInsertResponse decodes with rev present (201)", () => {
    const decoded = Schema.decodeUnknownSync(DocumentInsertResponse)({
      id: "doc1",
      ok: true,
      rev: "1-abc",
    });
    strictEqual(decoded.rev, "1-abc");
  });

  it("DocumentInsertResponse decodes batch mode (202) with no rev", () => {
    const decoded = Schema.decodeUnknownSync(DocumentInsertResponse)({
      id: "doc1",
      ok: true,
    });
    strictEqual(decoded.rev, undefined);
  });

  it("DocumentDestroyResponse decodes a batch delete (202) with no rev", () => {
    const decoded = Schema.decodeUnknownSync(DocumentDestroyResponse)({ ok: true, id: "doc" });
    strictEqual(decoded.ok, true);
    strictEqual(decoded.rev, undefined);
  });

  it("DocumentBulkResponse decodes a success entry", () => {
    const decoded = Schema.decodeUnknownSync(DocumentBulkResponse)({
      id: "doc1",
      ok: true,
      rev: "1-abc",
    });
    strictEqual(decoded.ok, true);
  });

  it("DocumentBulkResponse decodes an error entry", () => {
    const decoded = Schema.decodeUnknownSync(DocumentBulkResponse)({
      id: "doc1",
      error: "conflict",
      reason: "Document update conflict.",
    });
    strictEqual(decoded.error, "conflict");
    strictEqual(decoded.ok, undefined);
    strictEqual(decoded.rev, undefined);
  });

  it("DocumentListResponse decodes with null offset and total_rows", () => {
    const decoded = Schema.decodeUnknownSync(DocumentListResponse)({
      offset: null,
      rows: [],
      total_rows: null,
    });
    strictEqual(decoded.offset, null);
    strictEqual(decoded.total_rows, null);
  });

  it("DocumentListResponse decodes with update_seq as string", () => {
    const decoded = Schema.decodeUnknownSync(DocumentListResponse)({
      offset: 0,
      rows: [],
      total_rows: 0,
      update_seq: "5-g1AAAACbeJzL",
    });
    strictEqual(decoded.update_seq, "5-g1AAAACbeJzL");
  });

  it("DocumentListResponse decodes error rows (missing key)", () => {
    const decoded = Schema.decodeUnknownSync(DocumentListResponse)({
      offset: 0,
      rows: [{ key: "fake", error: "not_found" }],
      total_rows: 0,
    });
    strictEqual(decoded.rows[0]!.id, undefined);
    strictEqual(decoded.rows[0]!.value, undefined);
    strictEqual(decoded.rows[0]!.error, "not_found");
  });

  it("DocumentListResponse decodes deleted tombstone rows", () => {
    const decoded = Schema.decodeUnknownSync(DocumentListResponse)({
      offset: 0,
      rows: [{ id: "gone", key: "gone", value: { rev: "2-abc", deleted: true } }],
      total_rows: 1,
    });
    strictEqual(decoded.rows[0]!.value!.deleted, true);
  });

  it("DocumentFetchResponse decodes a mix of success and lookup-failure rows", () => {
    const decoded = Schema.decodeUnknownSync(DocumentFetchResponse)({
      offset: 0,
      rows: [
        { id: "doc1", key: "doc1", value: { rev: "1-abc" } },
        { key: "missing", error: "not_found" },
      ],
      total_rows: 1,
    });
    strictEqual(decoded.rows.length, 2);
  });

  it("MangoResponse decodes with all optional fields present", () => {
    const decoded = Schema.decodeUnknownSync(MangoResponse)({
      docs: [{ _id: "doc1" }],
      bookmark: "g1AAA",
      warning: "no matching index found",
      execution_stats: {
        total_keys_examined: 10,
        total_docs_examined: 10,
        total_quorum_docs_examined: 0,
        results_returned: 1,
        execution_time_ms: 5.2,
      },
    });
    strictEqual(decoded.bookmark, "g1AAA");
    strictEqual(decoded.execution_stats!.results_returned, 1);
  });

  it("MangoResponse decodes without optional fields (bookmark is required)", () => {
    const decoded = Schema.decodeUnknownSync(MangoResponse)({
      docs: [],
      bookmark: "g1AAA",
    });
    strictEqual(decoded.bookmark, "g1AAA");
    strictEqual(decoded.warning, undefined);
    strictEqual(decoded.execution_stats, undefined);
  });

  it("MangoResponse rejects response without bookmark", () => {
    let threw = false;
    try {
      Schema.decodeUnknownSync(MangoResponse)({ docs: [] });
    } catch {
      threw = true;
    }
    strictEqual(threw, true);
  });

  it("CreateIndexResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(CreateIndexResponse)({
      result: "created",
      id: "_design/idx-abc",
      name: "my-index",
    });
    strictEqual(decoded.result, "created");
  });

  it("IndexListResponse decodes with null ddoc for special index", () => {
    const decoded = Schema.decodeUnknownSync(IndexListResponse)({
      total_rows: 1,
      indexes: [{ ddoc: null, name: "_all_docs", type: "special", def: { fields: [{ _id: "asc" }] } }],
    });
    strictEqual(decoded.indexes[0]!.ddoc, null);
    strictEqual(decoded.indexes[0]!.partitioned, undefined);
  });

  it("IndexListResponse decodes with partitioned index", () => {
    const decoded = Schema.decodeUnknownSync(IndexListResponse)({
      total_rows: 1,
      indexes: [
        { ddoc: "_design/idx", name: "my-idx", type: "json", def: { fields: ["title"] }, partitioned: true },
      ],
    });
    strictEqual(decoded.indexes[0]!.partitioned, true);
  });

  it("PartitionInfoResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(PartitionInfoResponse)({
      db_name: "mydb",
      sizes: { active: 100, external: 200 },
      partition: "mypart",
      doc_count: 5,
      doc_del_count: 1,
    });
    strictEqual(decoded.partition, "mypart");
  });

  it("BulkGetResponse decodes success and error entries", () => {
    const decoded = Schema.decodeUnknownSync(BulkGetResponse)({
      results: [
        { id: "doc1", docs: [{ ok: { _id: "doc1", _rev: "1-abc" } }] },
        {
          id: "missing",
          docs: [{ error: { id: "missing", rev: "undefined", error: "not_found", reason: "missing" } }],
        },
      ],
    });
    strictEqual(decoded.results.length, 2);
  });
});

// ---------------------------------------------------------------------------
// DesignDocument
// ---------------------------------------------------------------------------

describe("DesignDocument schema alignment", () => {
  it("DesignDocumentViewResponse decodes a normal map view", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentViewResponse)({
      offset: 0,
      rows: [{ id: "doc1", key: "alpha", value: 1 }],
      total_rows: 1,
    });
    strictEqual(decoded.offset, 0);
    strictEqual(decoded.total_rows, 1);
    strictEqual(decoded.rows[0]!.id, "doc1");
  });

  it("DesignDocumentViewResponse decodes a reduced view (no offset, no total_rows, no row id)", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentViewResponse)({
      rows: [{ key: null, value: 42 }],
    });
    strictEqual(decoded.offset, undefined);
    strictEqual(decoded.total_rows, undefined);
    strictEqual(decoded.rows[0]!.id, undefined);
  });

  it("DesignDocumentViewResponse decodes grouped view rows", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentViewResponse)({
      rows: [
        { key: "x", value: 2 },
        { key: "y", value: 1 },
      ],
    });
    strictEqual(decoded.rows.length, 2);
    strictEqual(decoded.rows[0]!.id, undefined);
  });

  it("DesignDocumentViewResponse decodes with update_seq", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentViewResponse)({
      offset: 0,
      rows: [],
      total_rows: 0,
      update_seq: "5-g1AAAABXeJzL",
    });
    strictEqual(decoded.update_seq, "5-g1AAAABXeJzL");
  });

  it("DesignDocumentViewResponse decodes error rows from view", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentViewResponse)({
      offset: 0,
      rows: [{ key: "missing-key", error: "not_found" }],
      total_rows: 0,
    });
    strictEqual(decoded.rows[0]!.error, "not_found");
    strictEqual(decoded.rows[0]!.value, undefined);
  });

  it("DesignDocumentSearchResponse decodes a normal search result", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentSearchResponse)({
      total_rows: 1,
      bookmark: "g1AAA",
      rows: [{ id: "doc-1", order: [1.5, 0], fields: { title: "hello" } }],
    });
    strictEqual(decoded.bookmark, "g1AAA");
    strictEqual(decoded.rows[0]!.order![0], 1.5);
  });

  it("DesignDocumentSearchResponse decodes search rows with string order elements", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentSearchResponse)({
      total_rows: 1,
      bookmark: "g1AAA",
      rows: [{ id: "doc-1", order: ["alpha", 0] }],
    });
    strictEqual(decoded.rows[0]!.order![0], "alpha");
  });

  it("DesignDocumentSearchResponse decodes a grouped result: no bookmark, key-less rows", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentSearchResponse)({
      total_rows: 1,
      rows: [{ id: "doc-1" }],
    });
    strictEqual(decoded.bookmark, undefined);
    strictEqual(decoded.rows[0]!.id, "doc-1");
  });

  it("DesignDocumentSearchResponse decodes with groups field", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentSearchResponse)({
      total_rows: 5,
      rows: [],
      groups: [
        { by: "category", groups: [{ key: "electronics", total_rows: 3, rows: [{ id: "doc1" }] }] },
      ],
    });
    strictEqual(decoded.groups !== undefined, true);
  });

  it("DesignDocumentSearchResponse decodes with counts and ranges", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentSearchResponse)({
      total_rows: 10,
      bookmark: "g1BBB",
      rows: [{ id: "doc-1" }],
      counts: { type: { article: 5, blog: 5 } },
      ranges: { price: { "[0 TO 100]": 3 } },
      highlights: { title: ["<em>hello</em>"] },
    });
    strictEqual(decoded.counts !== undefined, true);
    strictEqual(decoded.ranges !== undefined, true);
    strictEqual(decoded.highlights !== undefined, true);
  });

  it("DesignDocumentInfoResponse decodes", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentInfoResponse)({
      name: "test",
      view_index: {
        compact_running: false,
        language: "javascript",
        purge_seq: 0,
        signature: "abc123",
        sizes: { active: 100, file: 200, external: 150 },
        update_seq: "5-xyz",
        updater_running: false,
        waiting_clients: 0,
        waiting_commit: false,
      },
    });
    strictEqual(decoded.name, "test");
    strictEqual(decoded.view_index.language, "javascript");
    strictEqual(decoded.view_index.sizes.file, 200);
  });

  it("DesignDocumentInfoResponse decodes with string purge_seq", () => {
    const decoded = Schema.decodeUnknownSync(DesignDocumentInfoResponse)({
      name: "test",
      view_index: {
        compact_running: false,
        language: "javascript",
        purge_seq: "0-g1AAAA",
        signature: "abc123",
        sizes: { active: 0, file: 0, external: 0 },
        update_seq: 0,
        updater_running: false,
        waiting_clients: 0,
        waiting_commit: false,
      },
    });
    strictEqual(decoded.view_index.purge_seq, "0-g1AAAA");
  });
});
