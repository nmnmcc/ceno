<p align="center">
  <img src="assets/banner.jpg" alt="ceno" width="100%" />
</p>

# ceno

Type-safe [CouchDB](https://couchdb.apache.org/) client for [Effect](https://effect.website).

Features:

- **Type-safe** — Every response, parameter, and error is statically typed via Effect schemas.
- **Effect-native** — Built on `Effect.gen`, services, and layers. Compose with the full Effect ecosystem.
- **Backend-agnostic** — Service contracts live in `@ceno/core`; `@ceno/couchdb` is one implementation. A future PouchDB backend would implement the same interfaces.
- **Transport-agnostic** — No bundled `HttpClient`. You supply the transport layer (`FetchHttpClient`, `NodeHttpClient`, etc.).
- **Errors you can catch** — CouchDB error codes map to tagged error classes (`CenoNotFound`, `CenoConflict`, …) for precise `catchTag` handling.

## Installation

```bash
npm install @ceno/core @ceno/couchdb effect
```

## Getting started

```typescript
import { Database, Document, Server } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;

  const info = yield* server.info;
  console.log(`CouchDB ${info.version}`);

  yield* database.create("alice");
  const response = yield* document.put("alice", "rabbit", { happy: true });
});

program.pipe(
  Effect.provide(layer),
  Effect.provide(
    CouchDbClient.layer({
      url: "http://localhost:5984",
      username: "admin",
      password: Redacted.make("password"),
    }),
  ),
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise,
);
```

## Packages

| Package                               | Description                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`@ceno/core`](./packages/core)       | Backend-agnostic service contracts, schemas, and errors                                  |
| [`@ceno/couchdb`](./packages/couchdb) | CouchDB HTTP implementation — **[full API documentation](./packages/couchdb/README.md)** |

## Tests

```bash
yarn install
yarn test
```

## License

[MIT](./LICENSE)
