/**
 * 13 — Multi-Tenant SaaS
 *
 * Database-per-tenant architecture: each customer gets an isolated
 * database with access controls. An admin dashboard monitors all
 * tenants' health, triggers compaction, and can replicate data between
 * environments.
 *
 *   yarn start
 */

import { Database, Document } from "@ceno/core";
import { Client, CouchDB } from "@ceno/couchdb";
import { Effect, Layer, Redacted } from "effect";
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

const TENANTS = ["tenant-acme", "tenant-globex", "tenant-initech"];

const program = Effect.gen(function* () {
  const database = yield* Database.Database;
  const document = yield* Document.Document;

  // ─── Provision tenant databases ───

  for (const tenant of TENANTS) {
    yield* database.create(tenant);
  }
  console.log("Provisioned databases:", TENANTS.join(", "));

  // ─── Set security policies per tenant ───

  yield* database.setSecurity("tenant-acme", {
    admins: { names: ["acme-admin"], roles: ["admin"] },
    members: { names: ["acme-user1", "acme-user2"], roles: ["acme-member"] },
  });

  yield* database.setSecurity("tenant-globex", {
    admins: { names: [], roles: ["admin"] },
    members: { names: ["hank"], roles: ["globex-member"] },
  });

  yield* database.setSecurity("tenant-initech", {
    admins: { names: ["bill"], roles: ["admin"] },
    members: { names: [], roles: ["initech-member"] },
  });

  // Verify a tenant's security settings
  const acmeSecurity = yield* database.getSecurity("tenant-acme");
  console.log("\nAcme security:");
  console.log("  Admins:", JSON.stringify(acmeSecurity.admins));
  console.log("  Members:", JSON.stringify(acmeSecurity.members));

  // ─── Seed tenant data ───

  const acmeDocs = document.in("tenant-acme");
  yield* acmeDocs.bulk([
    { _id: "proj-1", name: "Roadrunner Trap v2", status: "active", budget: 50000 },
    { _id: "proj-2", name: "Anvil Delivery", status: "completed", budget: 12000 },
    { _id: "proj-3", name: "Rocket Skates R&D", status: "active", budget: 75000 },
  ]);

  const globexDocs = document.in("tenant-globex");
  yield* globexDocs.bulk([
    { _id: "proj-1", name: "Doomsday Device", status: "active", budget: 999999 },
    { _id: "proj-2", name: "Employee Handbook v3", status: "active", budget: 500 },
  ]);

  const initechDocs = document.in("tenant-initech");
  yield* initechDocs.bulk([{ _id: "proj-1", name: "TPS Report System", status: "active", budget: 3000 }]);

  // ─── Admin dashboard: multi-database info ───

  const dbInfos = yield* database.dbsInfoPost(TENANTS);
  console.log("\nTenant dashboard:");
  for (const entry of dbInfos) {
    const info = entry.info as { doc_count?: number; sizes?: { active?: number } } | null;
    const docCount = info?.doc_count ?? 0;
    const sizeKB = ((info?.sizes?.active ?? 0) / 1024).toFixed(1);
    console.log(`  ${entry.key}: ${docCount} docs, ${sizeKB} KB active`);
  }

  // ─── Per-tenant info ───

  const acmeInfo = yield* database.info("tenant-acme");
  console.log("\nAcme details:");
  console.log("  Documents:", acmeInfo.doc_count);
  console.log("  Compact running:", acmeInfo.compact_running);
  console.log(
    "  Cluster config: n=%d q=%d r=%d w=%d",
    acmeInfo.cluster.n,
    acmeInfo.cluster.q,
    acmeInfo.cluster.r,
    acmeInfo.cluster.w,
  );

  // ─── Maintenance: compact and revision limits ───

  // Check current revision limit
  const revsLimit = yield* database.getRevsLimit("tenant-acme");
  console.log("\nAcme revs limit:", revsLimit);

  // Tighten revision history to save disk space
  yield* database.setRevsLimit("tenant-acme", 100);
  const newLimit = yield* database.getRevsLimit("tenant-acme");
  console.log("Updated revs limit:", newLimit);

  // Trigger compaction on a busy tenant
  yield* database.compact("tenant-acme");
  console.log("Compaction triggered for tenant-acme");

  // Clean up unused view indexes
  yield* database.viewCleanup("tenant-acme");
  console.log("View cleanup done for tenant-acme");

  // ─── Replicate a tenant's data to a backup database ───

  yield* database.create("tenant-acme-backup");

  const replication = yield* database.replicate({
    source: "tenant-acme",
    target: "tenant-acme-backup",
    create_target: false,
  });
  console.log("\nReplication complete:", replication.ok);
  console.log("  Session:", replication.session_id);
  console.log("  Docs read:", replication.history[0]?.docs_read);
  console.log("  Docs written:", replication.history[0]?.docs_written);

  // Verify backup has the data
  const backupDocs = document.in("tenant-acme-backup");
  const backupList = yield* backupDocs.list();
  console.log("  Backup docs:", backupList.rows.length);

  // ─── Tenant offboarding ───

  for (const tenant of TENANTS) {
    yield* database.destroy(tenant);
  }
  yield* database.destroy("tenant-acme-backup");
  console.log("\nAll tenant databases destroyed");
});

program.pipe(Effect.provide(CenoLayer), Effect.runPromise);
