import { Server } from "@ceno/core";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect } from "effect";

import { TestLayer } from "./helpers";

describe("Server", () => {
  it.effect("info returns server metadata", () =>
    Effect.gen(function* () {
      const server = yield* Server;
      const info = yield* server.info;
      strictEqual(info.couchdb, "Welcome");
      strictEqual(typeof info.version, "string");
      strictEqual(typeof info.uuid, "string");
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("uuids returns one UUID by default", () =>
    Effect.gen(function* () {
      const server = yield* Server;
      const result = yield* server.uuids();
      strictEqual(result.uuids.length, 1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("uuids returns requested count", () =>
    Effect.gen(function* () {
      const server = yield* Server;
      const result = yield* server.uuids({ count: 5 });
      strictEqual(result.uuids.length, 5);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("session.login authenticates with valid credentials", () =>
    Effect.gen(function* () {
      const server = yield* Server;
      const result = yield* server.auth({ name: "admin", password: "admin" });
      strictEqual(result.ok, true);
      strictEqual(result.name, "admin");
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("session.current returns current session info", () =>
    Effect.gen(function* () {
      const server = yield* Server;
      const result = yield* server.session;
      strictEqual(result.ok, true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("session.logout closes session", () =>
    Effect.gen(function* () {
      const server = yield* Server;
      const result = yield* server.logout;
      strictEqual(result.ok, true);
    }).pipe(Effect.provide(TestLayer)),
  );
});
