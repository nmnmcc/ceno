# @ceno/couchdb

CouchDB HTTP implementation of [`@ceno/core`](../core) services — a type-safe CouchDB client built on [Effect](https://effect.website).

[`@ceno/core`](../core) 服务的 CouchDB HTTP 实现——基于 [Effect](https://effect.website) 的类型安全 CouchDB 客户端。

## Install / 安装

```bash
npm install @ceno/core @ceno/couchdb effect
```

## Usage / 用法

```typescript
import { Database, Document, Server } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;

  // Server info / 服务器信息
  const info = yield* server.info;

  // Create a database / 创建数据库
  yield* database.create("mydb");

  // Insert a document / 插入文档
  const result = yield* document.insert("mydb", { title: "Hello" });

  // Get a document / 获取文档
  const doc = yield* document.get("mydb", result.id);
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

## Layer Composition / Layer 组合

The package-level `layer` provides all five services. To use individual services, provide only the layers you need:

包级别的 `layer` 提供全部五个服务。如需单独使用某个服务，只提供所需的 Layer：

```typescript
import { CouchDbServer } from "@ceno/couchdb";

program.pipe(
  Effect.provide(CouchDbServer.layer),
  // ...
);
```

## Transport / 传输层

ceno is transport-agnostic. You must supply an `HttpClient` layer:

ceno 是传输层无关的，你需要自行提供 `HttpClient` Layer：

- **Browser / Node.js (fetch)**: `FetchHttpClient.layer` from `effect/unstable/http`
- **Node.js (http)**: `NodeHttpClient.layer` from `effect/unstable/http`

## Error Handling / 错误处理

Errors are decoded by `HttpApiClient` based on HTTP status codes and mapped to typed `@ceno/core` error classes:

错误由 `HttpApiClient` 根据 HTTP 状态码解码，映射为 `@ceno/core` 中的类型化错误类：

```typescript
import { CenoNotFound } from "@ceno/core";

const doc = yield * document.get("mydb", "id").pipe(Effect.catchTag("CenoNotFound", () => Effect.succeed(null)));
```

## License

[MIT](../../LICENSE)
