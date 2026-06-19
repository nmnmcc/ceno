<p align="center">
  <img src="assets/banner.jpg" alt="ceno" width="100%" />
</p>

# ceno

类型安全的 [CouchDB](https://couchdb.apache.org/) 客户端，基于 [Effect](https://effect.website) 构建。

特性：

- **类型安全** — 每个响应、参数和错误都通过 Effect Schema 静态类型化。
- **Effect 原生** — 基于 `Effect.gen`、Service 和 Layer 构建，与整个 Effect 生态系统无缝组合。
- **后端无关** — 服务契约定义在 `@ceno/core` 中；`@ceno/couchdb` 是其中一种实现。未来的 PouchDB 后端将实现相同的接口。
- **传输层无关** — 不捆绑任何 `HttpClient`。由你自行提供传输层（`FetchHttpClient`、`NodeHttpClient` 等）。
- **可精确捕获的错误** — CouchDB 错误码映射为标签化错误类（`CenoNotFound`、`CenoConflict`……），支持精确的 `catchTag` 处理。

## 安装

```bash
npm install @ceno/core @ceno/couchdb effect
```

## 快速开始

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

## 包

| 包                                    | 说明                                                                 |
| ------------------------------------- | -------------------------------------------------------------------- |
| [`@ceno/core`](./packages/core)       | 后端无关的服务契约、Schema 和错误类型                                |
| [`@ceno/couchdb`](./packages/couchdb) | CouchDB HTTP 实现——**[完整 API 文档](./packages/couchdb/README.md)** |

## 测试

```bash
yarn install
yarn test
```

## 许可证

[MIT](./LICENSE)
