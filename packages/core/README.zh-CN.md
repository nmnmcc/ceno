# @ceno/core

[ceno](https://github.com/nmnmcc/ceno) 的后端无关服务契约、Schema 和错误类型——基于 [Effect](https://effect.website) 的类型安全 CouchDB 客户端。

此包定义了后端实现（如 [`@ceno/couchdb`](../couchdb)）需要满足的服务接口。仅包含契约、Schema、错误类型和工具函数，不包含实现代码。

## 安装

```bash
npm install @ceno/core effect
```

## 目录

- [架构](#架构)
- [服务](#服务)
  - [Server](#server)
  - [Database](#database)
  - [Document](#document)
  - [DesignDocument](#designdocument)
  - [LocalDocument](#localdocument)
- [错误处理](#错误处理)
- [工具函数](#工具函数)
  - [parseNdjsonStream](#parsenjsonstream)
- [许可证](#许可证)

## 架构

ceno 将**契约**与**实现**分离：

```
@ceno/core       — 服务接口、Schema、错误类型（本包）
@ceno/couchdb    — CouchDB HTTP 实现（Layer 提供者）
```

应用代码从 `@ceno/core` 导入服务标签（`Server`、`Database`、`Document`……），并通过后端特定的 Layer 提供实现。切换后端只需更换 Layer，应用代码无需改动。

```typescript
import { Database, Document, Server } from "@ceno/core";
// 提供 CouchDB 实现
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;
  // ...
});

program.pipe(Effect.provide(layer) /* ... */);
```

## 服务

每个服务都是一个 `Context.Service` 标签及其接口。导入标签，在 `Effect.gen` 块中 yield，然后调用其方法。

### Server

服务器元数据、UUID 和认证。

| 方法                | 说明                                |
| ------------------- | ----------------------------------- |
| `info`              | 服务器元数据（`GET /`）             |
| `uuids(options?)`   | 生成 UUID（`GET /_uuids`）          |
| `auth(credentials)` | Cookie 会话认证（`POST /_session`） |
| `session`           | 当前会话信息（`GET /_session`）     |
| `logout`            | 关闭会话（`DELETE /_session`）      |

### Database

数据库管理、变更订阅、复制和维护。

| 方法                               | 说明                                                  |
| ---------------------------------- | ----------------------------------------------------- |
| `create(name, options?)`           | 创建数据库（`PUT /{db}`）                             |
| `get(name)`                        | 数据库元数据（`GET /{db}`）                           |
| `head(name)`                       | 检查是否存在（`HEAD /{db}`）                          |
| `destroy(name)`                    | 删除数据库（`DELETE /{db}`）                          |
| `list(options?)`                   | 列出所有数据库名称（`GET /_all_dbs`）                 |
| `dbsInfo(options?)`                | 获取多个数据库元数据（`GET /_dbs_info`）              |
| `dbsInfoPost(keys)`                | 按名称获取指定数据库元数据（`POST /_dbs_info`）       |
| `compact(name, ddoc?)`             | 触发压缩（`POST /{db}/_compact`）                     |
| `viewCleanup(name)`                | 清理未使用的视图索引（`POST /{db}/_view_cleanup`）    |
| `ensureFullCommit(name)`           | 确保数据写入磁盘（`POST /{db}/_ensure_full_commit`）  |
| `getSecurity(name)`                | 获取安全对象（`GET /{db}/_security`）                 |
| `setSecurity(name, security)`      | 设置安全对象（`PUT /{db}/_security`）                 |
| `getRevsLimit(name)`               | 获取修订版本限制（`GET /{db}/_revs_limit`）           |
| `setRevsLimit(name, limit)`        | 设置修订版本限制（`PUT /{db}/_revs_limit`）           |
| `purge(name, body)`                | 永久移除修订版本（`POST /{db}/_purge`）               |
| `getPurgedInfosLimit(name)`        | 获取已清除信息限制（`GET /{db}/_purged_infos_limit`） |
| `setPurgedInfosLimit(name, limit)` | 设置已清除信息限制（`PUT /{db}/_purged_infos_limit`） |
| `missingRevs(name, body)`          | 查找缺失的修订版本（`POST /{db}/_missing_revs`）      |
| `revsDiff(name, body)`             | 查找修订版本差异（`POST /{db}/_revs_diff`）           |
| `replicate(options)`               | 启动复制（`POST /_replicate`）                        |
| `changes(name, options?)`          | 变更源（`GET /{db}/_changes`）                        |
| `changesPost(name, body)`          | 带请求体过滤的变更源（`POST /{db}/_changes`）         |
| `changesStream(name, options?)`    | 连续变更源（Stream 形式）                             |
| `updates(options?)`                | 全局数据库更新事件（`GET /_db_updates`）              |

### Document

文档 CRUD、批量操作、Mango 查询、附件和分区数据库操作。

| 方法                                                   | 说明                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `insert(db, body, options?)`                           | 使用服务器生成的 ID 插入（`POST /{db}`）                    |
| `put(db, docid, body, options?)`                       | 在指定 ID 处创建或更新（`PUT /{db}/{docid}`）               |
| `get(db, docid, options?)`                             | 获取文档（`GET /{db}/{docid}`）                             |
| `head(db, docid)`                                      | 检查文档是否存在（`HEAD /{db}/{docid}`）                    |
| `destroy(db, docid, rev, options?)`                    | 删除文档（`DELETE /{db}/{docid}`）                          |
| `bulk(db, docs)`                                       | 批量插入/更新/删除（`POST /{db}/_bulk_docs`）               |
| `bulkGet(db, docs)`                                    | 批量按 ID 获取（`POST /{db}/_bulk_get`）                    |
| `list(db, options?)`                                   | 列出所有文档（`GET /{db}/_all_docs`）                       |
| `listStream(db, options?)`                             | 列出所有文档（Stream 形式）                                 |
| `fetch(db, keys, options?)`                            | 按键获取指定文档（`POST /{db}/_all_docs`）                  |
| `find(db, query)`                                      | Mango 查询（`POST /{db}/_find`）                            |
| `findStream(db, query)`                                | Mango 查询结果（Stream 形式）                               |
| `createIndex(db, index)`                               | 创建 Mango 索引（`POST /{db}/_index`）                      |
| `deleteIndex(db, ddoc, name)`                          | 删除 Mango 索引（`DELETE /{db}/_index/{ddoc}/json/{name}`） |
| `listIndexes(db)`                                      | 列出所有 Mango 索引（`GET /{db}/_index`）                   |
| `explain(db, query)`                                   | 查看查询将使用哪个索引（`POST /{db}/_explain`）             |
| `attachmentInsert(db, docid, attname, data, options?)` | 上传附件（`PUT /{db}/{docid}/{attname}`）                   |
| `attachmentGet(db, docid, attname, options?)`          | 以字节流下载附件（`GET /{db}/{docid}/{attname}`）           |
| `attachmentHead(db, docid, attname)`                   | 检查附件是否存在（`HEAD /{db}/{docid}/{attname}`）          |
| `attachmentDestroy(db, docid, attname, rev, options?)` | 删除附件（`DELETE /{db}/{docid}/{attname}`）                |
| `partitionInfo(db, partition)`                         | 分区统计信息（`GET /{db}/_partition/{partition}`）          |
| `partitionedList(db, partition, options?)`             | 列出分区中的文档                                            |
| `partitionedFind(db, partition, query)`                | 在分区内执行 Mango 查询                                     |

### DesignDocument

视图查询、全文搜索、show/list/update 函数及分区变体。

| 方法                                                       | 说明                                               |
| ---------------------------------------------------------- | -------------------------------------------------- |
| `info(db, ddoc)`                                           | 视图索引元数据（`GET /{db}/_design/{ddoc}/_info`） |
| `view(db, ddoc, viewname, options?)`                       | 查询 MapReduce 视图（`GET .../_view/{viewname}`）  |
| `viewPost(db, ddoc, viewname, body)`                       | 通过 POST 查询视图                                 |
| `viewStream(db, ddoc, viewname, options?)`                 | 视图结果（Stream 形式）                            |
| `search(db, ddoc, index, options?)`                        | 全文搜索（`GET .../_search/{index}`）              |
| `searchStream(db, ddoc, index, options?)`                  | 搜索结果（Stream 形式）                            |
| `show(db, ddoc, func, docid)`                              | Show 函数（CouchDB 3.0 已弃用）                    |
| `updateHandler(db, ddoc, func, docid, body)`               | Update handler（CouchDB 3.0 已弃用）               |
| `viewWithList(db, ddoc, list, viewname, options?)`         | List 函数（CouchDB 3.0 已弃用）                    |
| `partitionedView(db, partition, ddoc, viewname, options?)` | 分区内视图查询                                     |
| `partitionedSearch(db, partition, ddoc, index, options?)`  | 分区内搜索                                         |

### LocalDocument

本地（非复制）文档 CRUD。

| 方法                                | 说明                                             |
| ----------------------------------- | ------------------------------------------------ |
| `get(db, docid)`                    | 获取本地文档（`GET /{db}/_local/{docid}`）       |
| `insert(db, docid, body, options?)` | 创建或更新（`PUT /{db}/_local/{docid}`）         |
| `destroy(db, docid, rev)`           | 删除（`DELETE /{db}/_local/{docid}`）            |
| `list(db)`                          | 列出所有本地文档（`GET /{db}/_local_docs`）      |
| `fetch(db, body)`                   | 按键获取指定本地文档（`POST /{db}/_local_docs`） |

> `Document` 和 `LocalDocument` 服务接受和返回 `unknown`。如需类型化、带版本迁移的文档操作（`SchemaDocument`、`SchemaLocalDocument`、`version`），请参阅 [`@ceno/schema`](../schema)。

## 错误处理

所有错误继承 `TaggedErrorClass` 并包含 `reason` 字段，支持类型安全的 `catchTag` 匹配：

| 错误类                    | CouchDB `error`         | HTTP 状态码 |
| ------------------------- | ----------------------- | ----------- |
| `CenoIllegalDatabaseName` | `illegal_database_name` | 400         |
| `CenoBadRequest`          | `bad_request`           | 400         |
| `CenoUnauthorized`        | `unauthorized`          | 401         |
| `CenoForbidden`           | `forbidden`             | 403         |
| `CenoNotFound`            | `not_found`             | 404         |
| `CenoConflict`            | `conflict`              | 409         |
| `CenoAlreadyExists`       | `file_exists`           | 412         |
| `CenoBadContentType`      | `bad_content_type`      | 415         |
| `CenoInternalServerError` | `internal_server_error` | 500         |

```typescript
import { CenoConflict, CenoNotFound, Document } from "@ceno/core";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const document = yield* Document;

  const doc = yield* document.get("alice", "rabbit").pipe(Effect.catchTag("CenoNotFound", () => Effect.succeed(null)));

  yield* document
    .put("alice", "rabbit", { happy: true })
    .pipe(Effect.catchTag("CenoConflict", () => Effect.logWarning("文档修订版本冲突")));
});
```

类型别名：

- `CenoError` — 所有九种错误类的联合类型
- `TransportError` — `HttpClientError | Schema.SchemaError`

## 工具函数

### parseNdjsonStream

将换行分隔的 JSON 字节流解析为类型化的 Effect `Stream`：

```typescript
import { parseNdjsonStream } from "@ceno/core";
import { Schema } from "effect";

const ChangeEvent = Schema.Struct({ seq: Schema.String, id: Schema.String });

const typedStream = parseNdjsonStream(ChangeEvent)(rawByteStream);
```

## 许可证

[MIT](../../LICENSE)
