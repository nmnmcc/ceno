# @ceno/couchdb

[`@ceno/core`](../core) 服务的 CouchDB HTTP 实现——基于 [Effect](https://effect.website) 的类型安全 CouchDB 客户端。

## 安装

```bash
npm install @ceno/core @ceno/couchdb effect
```

## 目录

- [快速开始](#快速开始)
- [配置](#配置)
- [Server 函数](#server-函数)
  - [server.info](#serverinfo)
  - [server.uuids([options])](#serveruuidsoptions)
  - [server.session.login(credentials)](#serversessionlogincredentials)
  - [server.session.current](#serversessioncurrent)
  - [server.session.logout](#serversessionlogout)
- [Database 函数](#database-函数)
  - [database.create(name, [options])](#databasecreatename-options)
  - [database.info(name)](#databaseinfoname)
  - [database.exists(name)](#databaseexistsname)
  - [database.destroy(name)](#databasedestroyname)
  - [database.list([options])](#databaselistoptions)
  - [database.compact(name, [ddoc])](#databasecompactname-ddoc)
  - [database.viewCleanup(name)](#databaseviewcleanupname)
  - [database.replicate(options)](#databasereplicateoptions)
  - [database.changes(name, [options])](#databasechangesname-options)
  - [database.updates([options])](#databaseupdatesoptions)
  - [database.security.get(name)](#databasesecuritygetname)
  - [database.security.set(name, security)](#databasesecuritysetname-security)
  - [database.revs.limit.get(name)](#databaserevslimitgetname)
  - [database.revs.limit.set(name, limit)](#databaserevslimitsetname-limit)
  - [database.revs.missing(name, body)](#databaserevsmissingname-body)
  - [database.revs.diff(name, body)](#databaserevsdiffname-body)
  - [database.purge(name, body)](#databasepurgename-body)
  - [database.purgedInfosLimit.get(name)](#databasepurgedinfoslimitgetname)
  - [database.purgedInfosLimit.set(name, limit)](#databasepurgedinfoslimitsetname-limit)
- [Document 函数](#document-函数)
  - [document.insert(db, body, [options])](#documentinsertdb-body-options)
  - [document.put(db, docid, body, [options])](#documentputdb-docid-body-options)
  - [document.get(db, docid, [options])](#documentgetdb-docid-options)
  - [document.exists(db, docid)](#documentexistsdb-docid)
  - [document.destroy(db, docid, rev, [options])](#documentdestroydb-docid-rev-options)
  - [document.bulk.write(db, docs)](#documentbulkwritedb-docs)
  - [document.bulk.get(db, docs)](#documentbulkgetdb-docs)
  - [document.list(db, [options])](#documentlistdb-options)
  - [document.fetch(db, keys, [options])](#documentfetchdb-keys-options)
  - [document.find(db, query)](#documentfinddb-query)
  - [document.index.create(db, index)](#documentindexcreatedb-index)
  - [document.index.delete(db, ddoc, name)](#documentindexdeletedb-ddoc-name)
  - [document.index.list(db)](#documentindexlistdb)
  - [document.explain(db, query)](#documentexplaindb-query)
- [Attachment 函数](#attachment-函数)
  - [document.attachment.insert(db, docid, attname, data, [options])](#documentattachmentinsertdb-docid-attname-data-options)
  - [document.attachment.get(db, docid, attname, [options])](#documentattachmentgetdb-docid-attname-options)
  - [document.attachment.exists(db, docid, attname)](#documentattachmentexistsdb-docid-attname)
  - [document.attachment.destroy(db, docid, attname, rev, [options])](#documentattachmentdestroydb-docid-attname-rev-options)
- [DesignDocument 函数](#designdocument-函数)
  - [designDocument.info(db, ddoc)](#designdocumentinfodb-ddoc)
  - [designDocument.view(db, ddoc, viewname, [options])](#designdocumentviewdb-ddoc-viewname-options)
  - [designDocument.search(db, ddoc, index, [options])](#designdocumentsearchdb-ddoc-index-options)
  - [designDocument.render.show(db, ddoc, func, docid)](#designdocumentrendershowdb-ddoc-func-docid)
  - [designDocument.render.update(db, ddoc, func, docid, body)](#designdocumentrenderupdatedb-ddoc-func-docid-body)
  - [designDocument.render.list(db, ddoc, list, viewname, [options])](#designdocumentrenderlistdb-ddoc-list-viewname-options)
- [分区函数](#分区函数)
  - [document.partition.info(db, partition)](#documentpartitioninfodb-partition)
  - [document.partition.list(db, partition, [options])](#documentpartitionlistdb-partition-options)
  - [document.partition.find(db, partition, query)](#documentpartitionfinddb-partition-query)
  - [designDocument.partition.view(db, partition, ddoc, viewname, [options])](#designdocumentpartitionviewdb-partition-ddoc-viewname-options)
  - [designDocument.partition.search(db, partition, ddoc, index, [options])](#designdocumentpartitionsearchdb-partition-ddoc-index-options)
- [LocalDocument 函数](#localdocument-函数)
  - [localDocument.get(db, docid)](#localdocumentgetdb-docid)
  - [localDocument.exists(db, docid)](#localdocumentexistsdb-docid)
  - [localDocument.insert(db, docid, body, [options])](#localdocumentinsertdb-docid-body-options)
  - [localDocument.destroy(db, docid, rev)](#localdocumentdestroydb-docid-rev)
  - [localDocument.list(db)](#localdocumentlistdb)
  - [localDocument.fetch(db, body)](#localdocumentfetchdb-body)
- [TypeScript](#typescript)
  - [Schema 文档](#schema-文档)
  - [版本迁移](#版本迁移)
  - [数据库级别变体](#数据库级别变体)
  - [Schema 本地文档](#schema-本地文档)
- [错误处理](#错误处理)
- [流式处理](#流式处理)
- [测试](#测试)

## 快速开始

连接 CouchDB 服务器，创建数据库并插入文档：

```typescript
import { Database, Document, Server } from "@ceno/core";
import { CouchDbClient, layer } from "@ceno/couchdb";
import { Effect, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

const program = Effect.gen(function* () {
  const server = yield* Server;
  const database = yield* Database;
  const document = yield* Document;

  // 检查服务器是否正常
  const info = yield* server.info;
  console.log(`CouchDB ${info.version}`);

  // 创建数据库
  yield* database.create("alice");

  // 插入文档
  const response = yield* document.put("alice", "rabbit", { happy: true });
  console.log(response);
  // { ok: true, id: 'rabbit', rev: '1-...' }
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

## 配置

### CouchDbClient.layer

提供 CouchDB URL 和 Basic-Auth 凭证来创建客户端 Layer：

```typescript
import { CouchDbClient } from "@ceno/couchdb";
import { Redacted } from "effect";

const clientLayer = CouchDbClient.layer({
  url: "http://localhost:5984",
  username: "admin",
  password: Redacted.make("password"),
});
```

密码使用 `Redacted` 包装，防止被意外日志记录或序列化。

### 提供传输层

ceno 不捆绑任何 HTTP 传输层，你需要自行提供适合运行时的实现：

```typescript
// 浏览器 / Node.js 18+

// Node.js (undici)

import { NodeHttpClient } from "@effect/platform-node";
import { FetchHttpClient } from "effect/unstable/http";

Effect.provide(program, FetchHttpClient.layer);

Effect.provide(program, NodeHttpClient.layer);
```

### 提供单个服务

合并后的 `layer` 提供全部五个服务。如果只需要部分服务，可以单独提供：

```typescript
import { CouchDbServer } from "@ceno/couchdb";

program.pipe(Effect.provide(CouchDbServer.layer));
```

## Server 函数

### server.info

获取 CouchDB 服务器元数据（`GET /`）：

```typescript
const info = yield * server.info;
// { couchdb: 'Welcome', version: '3.4.3', ... }
```

### server.uuids([options])

生成一个或多个 UUID（`GET /_uuids`）：

```typescript
const { uuids } = yield * server.uuids({ count: 3 });
// ['6e1295ed6c29495e54cc05947f18c8af', ...]
```

### server.session.login(credentials)

通过 Cookie 会话进行认证（`POST /_session`）：

```typescript
const response = yield * server.session.login({ name: "admin", password: "password" });
// { ok: true, name: 'admin', roles: ['_admin'] }
```

### server.session.current

获取当前会话信息（`GET /_session`）：

```typescript
const session = yield * server.session.current;
// { ok: true, userCtx: { name: 'admin', roles: ['_admin'] }, info: { ... } }
```

### server.session.logout

关闭当前会话（`DELETE /_session`）：

```typescript
yield * server.session.logout;
```

## Database 函数

### database.create(name, [options])

创建数据库（`PUT /{db}`）：

```typescript
yield * database.create("alice");

// 带选项
yield * database.create("alice", { n: 3, partitioned: true });
```

### database.info(name)

获取数据库元数据（`GET /{db}`）。此方法有多个重载：

```typescript
// 传入字符串——获取单个数据库的元数据
const info = yield * database.info("alice");
// { db_name: 'alice', doc_count: 42, ... }

// 传入字符串数组——获取多个数据库的元数据（`POST /_dbs_info`）
const infos = yield * database.info(["alice", "bob"]);

// 传入 options（或不传参）——列出多个数据库的元数据（`GET /_dbs_info`）
const all = yield * database.info();
```

### database.exists(name)

检查数据库是否存在（`HEAD /{db}`）。返回布尔值——存在为 `true`，不存在为 `false`：

```typescript
const isPresent = yield * database.exists("alice");
```

### database.destroy(name)

删除数据库（`DELETE /{db}`）：

```typescript
yield * database.destroy("alice");
```

### database.list([options])

列出所有数据库名称（`GET /_all_dbs`）：

```typescript
const names = yield * database.list();
// ['alice', 'bob', ...]
```

### database.compact(name, [ddoc])

触发压缩（`POST /{db}/_compact`）。如果提供了 `ddoc`，则压缩该设计文档的视图：

```typescript
yield * database.compact("alice");
yield * database.compact("alice", "my-ddoc");
```

### database.viewCleanup(name)

清理未使用的视图索引文件（`POST /{db}/_view_cleanup`），返回 `void`：

```typescript
yield * database.viewCleanup("alice");
```

### database.replicate(options)

启动复制（`POST /_replicate`）：

```typescript
const result =
  yield *
  database.replicate({
    source: "alice",
    target: "http://otherhost:5984/alice",
    create_target: true,
  });
```

### database.changes(name, [options])

获取变更源（`GET /{db}/_changes`）：

```typescript
const changes = yield * database.changes("alice", { since: 0, include_docs: true });
changes.results.forEach((change) => {
  console.log(change.id, change.changes);
});
```

POST 方式（支持在请求体中传递 `doc_ids`/`selector`）：

```typescript
const changes =
  yield *
  database.changes("alice", {
    doc_ids: ["rabbit", "hatter"],
  });
```

传入 `stream: true` 可返回连续变更源的解析变更项流：

```typescript
const stream =
  yield *
  database.changes("alice", {
    feed: "continuous",
    include_docs: true,
    stream: true,
  });
```

### database.updates([options])

获取全局数据库更新事件（`GET /_db_updates`）：

```typescript
const updates = yield * database.updates();
```

### database.security.get(name)

获取数据库安全对象（`GET /{db}/_security`）：

```typescript
const security = yield * database.security.get("alice");
```

### database.security.set(name, security)

设置数据库安全对象（`PUT /{db}/_security`）：

```typescript
yield *
  database.security.set("alice", {
    admins: { names: ["admin"], roles: [] },
    members: { names: [], roles: ["reader"] },
  });
```

### database.revs.limit.get(name)

获取当前修订版本限制（`GET /{db}/_revs_limit`）：

```typescript
const limit = yield * database.revs.limit.get("alice");
```

### database.revs.limit.set(name, limit)

设置修订版本限制（`PUT /{db}/_revs_limit`）：

```typescript
yield * database.revs.limit.set("alice", 500);
```

### database.revs.missing(name, body)

查找数据库中不存在的文档修订版本（`POST /{db}/_missing_revs`）：

```typescript
const result =
  yield *
  database.revs.missing("alice", {
    rabbit: ["1-abc", "2-def"],
  });
```

### database.revs.diff(name, body)

返回不对应于数据库中已存修订版本的子集（`POST /{db}/_revs_diff`）：

```typescript
const result =
  yield *
  database.revs.diff("alice", {
    rabbit: ["1-abc", "2-def"],
  });
```

### database.purge(name, body)

永久移除指定文档修订版本的引用（`POST /{db}/_purge`）：

```typescript
yield *
  database.purge("alice", {
    "doc-id": ["1-abc", "2-def"],
  });
```

### database.purgedInfosLimit.get(name)

获取当前 purged infos 限制（`GET /{db}/_purged_infos_limit`）：

```typescript
const limit = yield * database.purgedInfosLimit.get("alice");
```

### database.purgedInfosLimit.set(name, limit)

设置 purged infos 限制（`PUT /{db}/_purged_infos_limit`）：

```typescript
yield * database.purgedInfosLimit.set("alice", 1000);
```

## Document 函数

### document.insert(db, body, [options])

插入文档，ID 由服务器生成或从请求体的 `_id` 获取（`POST /{db}`）：

```typescript
const response = yield * document.insert("alice", { happy: true });
// { ok: true, id: '...', rev: '1-...' }

// 在请求体中指定 _id
const response = yield * document.insert("alice", { _id: "rabbit", happy: true });
```

### document.put(db, docid, body, [options])

在指定 ID 处创建或更新文档（`PUT /{db}/{docid}`）：

```typescript
const response = yield * document.put("alice", "rabbit", { happy: true });

// 更新已有文档（需包含 _rev）
const response =
  yield *
  document.put("alice", "rabbit", {
    _rev: "1-23202479633c2b380f79507a776743d5",
    happy: false,
  });
```

### document.get(db, docid, [options])

获取文档（`GET /{db}/{docid}`）：

```typescript
const doc = yield * document.get("alice", "rabbit");
```

带可选查询参数：

```typescript
const doc = yield * document.get("alice", "rabbit", { revs_info: true });
```

### document.exists(db, docid)

检查文档是否存在（`HEAD /{db}/{docid}`）。返回布尔值——存在为 `true`，不存在为 `false`：

```typescript
const isPresent = yield * document.exists("alice", "rabbit");
```

### document.destroy(db, docid, rev, [options])

删除文档（`DELETE /{db}/{docid}`）：

```typescript
const response = yield * document.destroy("alice", "rabbit", "3-66c01cdf99e84c83a9b3fe65b88db8c0");
```

### document.bulk.write(db, docs)

批量插入/更新/删除（`POST /{db}/_bulk_docs`）：

```typescript
const results =
  yield *
  document.bulk.write("alice", [
    { _id: "rabbit", happy: true },
    { _id: "hatter", mad: true },
  ]);
```

### document.bulk.get(db, docs)

在单次请求中按 ID 和可选修订版本获取多个文档（`POST /{db}/_bulk_get`）：

```typescript
const results = yield * document.bulk.get("alice", [{ id: "rabbit" }, { id: "hatter", rev: "2-abc" }]);
```

### document.list(db, [options])

列出所有文档（`GET /{db}/_all_docs`）：

```typescript
const result = yield * document.list("alice", { include_docs: true, limit: 10 });
result.rows.forEach((row) => {
  console.log(row.id, row.doc);
});
```

传入 `stream: true` 可返回解码文本流，用于处理大型结果集：

```typescript
const stream = yield * document.list("alice", { include_docs: true, stream: true });
```

### document.fetch(db, keys, [options])

按键获取指定文档（`POST /{db}/_all_docs`）：

```typescript
const result = yield * document.fetch("alice", ["rabbit", "hatter", "dormouse"]);
```

### document.find(db, query)

执行 [Mango 查询](https://docs.couchdb.org/en/stable/api/database/find.html)（`POST /{db}/_find`）：

```typescript
const result =
  yield *
  document.find("alice", {
    selector: {
      name: { $eq: "Brian" },
      age: { $gt: 25 },
    },
    fields: ["name", "age"],
    limit: 50,
  });
```

传入 `stream: true` 可返回解码文本流：

```typescript
const stream =
  yield *
  document.find("alice", {
    selector: { name: { $eq: "Brian" } },
    stream: true,
  });
```

### document.index.create(db, index)

创建 Mango 索引（`POST /{db}/_index`）：

```typescript
const response =
  yield *
  document.index.create("alice", {
    index: { fields: ["name"] },
    name: "name-index",
  });
```

### document.index.delete(db, ddoc, name)

删除 Mango 索引（`DELETE /{db}/_index/{ddoc}/json/{name}`）：

```typescript
yield * document.index.delete("alice", "_design/name-index", "name-index");
```

### document.index.list(db)

列出所有 Mango 索引（`GET /{db}/_index`）：

```typescript
const result = yield * document.index.list("alice");
```

### document.explain(db, query)

查看 Mango 查询将使用哪个索引，但不执行查询（`POST /{db}/_explain`）：

```typescript
const plan =
  yield *
  document.explain("alice", {
    selector: { name: { $eq: "Brian" } },
  });
```

## Attachment 函数

### document.attachment.insert(db, docid, attname, data, [options])

上传附件（`PUT /{db}/{docid}/{attname}`）：

```typescript
const response = yield * document.attachment.insert("alice", "rabbit", "picture.png", imageData, { rev: "1-abc" });
```

### document.attachment.get(db, docid, attname, [options])

以字节流下载附件（`GET /{db}/{docid}/{attname}`）：

```typescript
const stream = yield * document.attachment.get("alice", "rabbit", "picture.png");
```

### document.attachment.exists(db, docid, attname)

检查附件是否存在（`HEAD /{db}/{docid}/{attname}`）。返回布尔值——存在为 `true`，不存在为 `false`：

```typescript
const isPresent = yield * document.attachment.exists("alice", "rabbit", "picture.png");
```

### document.attachment.destroy(db, docid, attname, rev, [options])

删除附件（`DELETE /{db}/{docid}/{attname}`）：

```typescript
yield * document.attachment.destroy("alice", "rabbit", "picture.png", "2-def");
```

## DesignDocument 函数

设计文档通过 `Document` 服务管理（它们是 `_design/` 下的普通文档）。`DesignDocument` 服务提供视图、搜索等设计文档特有的操作。

### designDocument.info(db, ddoc)

获取设计文档的视图索引元数据（`GET /{db}/_design/{ddoc}/_info`）：

```typescript
const info = yield * designDocument.info("alice", "my-ddoc");
```

### designDocument.view(db, ddoc, viewname, [options])

查询 MapReduce 视图（`GET /{db}/_design/{ddoc}/_view/{viewname}`）：

```typescript
const result =
  yield *
  designDocument.view("alice", "characters", "happy_ones", {
    key: "Tea Party",
    include_docs: true,
  });
result.rows.forEach((row) => {
  console.log(row.value);
});
```

按多个键过滤：

```typescript
const result =
  yield *
  designDocument.view("alice", "characters", "soldiers", {
    keys: ["Hearts", "Clubs"],
  });
```

通过 POST 查询视图，支持在请求体中传递键（`POST /{db}/_design/{ddoc}/_view/{viewname}`）。直接传入请求体对象即可：

```typescript
const result =
  yield *
  designDocument.view("alice", "characters", "soldiers", {
    keys: ["Hearts", "Clubs"],
  });
```

传入 `stream: true` 可返回解码文本流：

```typescript
const stream = yield * designDocument.view("alice", "characters", "happy_ones", { stream: true });
```

### designDocument.search(db, ddoc, index, [options])

查询全文搜索索引（`GET /{db}/_design/{ddoc}/_search/{index}`）。需要 Clouseau 插件：

```typescript
const result =
  yield *
  designDocument.search("alice", "characters", "happy_ones", {
    q: "cat",
  });
```

传入 `stream: true` 可返回解码文本流：

```typescript
const stream =
  yield *
  designDocument.search("alice", "characters", "happy_ones", {
    q: "cat",
    stream: true,
  });
```

### designDocument.render.show(db, ddoc, func, docid)

通过 show 函数渲染文档（`GET /{db}/_design/{ddoc}/_show/{func}/{docid}`）。在 CouchDB 3.0 中已弃用：

```typescript
const result = yield * designDocument.render.show("alice", "characters", "format_doc", "rabbit");
```

### designDocument.render.update(db, ddoc, func, docid, body)

对文档应用 update handler（`PUT /{db}/_design/{ddoc}/_update/{func}/{docid}`）。在 CouchDB 3.0 中已弃用：

```typescript
const result =
  yield * designDocument.render.update("alice", "update", "inplace", "rabbit", { field: "happy", value: false });
```

### designDocument.render.list(db, ddoc, list, viewname, [options])

对视图应用 list 函数（`GET /{db}/_design/{ddoc}/_list/{list}/{viewname}`）。在 CouchDB 3.0 中已弃用：

```typescript
const result = yield * designDocument.render.list("alice", "characters", "my_list", "happy_ones");
```

## 分区函数

与[分区数据库](https://docs.couchdb.org/en/stable/partitioned-dbs/index.html)相关的函数。使用 `{ partitioned: true }` 创建分区数据库：

```typescript
yield * database.create("my-partitioned-db", { partitioned: true });
```

分区数据库中的文档必须具有两段式 `_id`：`<分区键>:<文档 ID>`：

```typescript
yield *
  document.put("my-partitioned-db", "canidae:dog", {
    name: "Dog",
    latin: "Canis lupus familiaris",
  });
```

### document.partition.info(db, partition)

获取分区统计信息（`GET /{db}/_partition/{partition}`）：

```typescript
const stats = yield * document.partition.info("my-partitioned-db", "canidae");
```

### document.partition.list(db, partition, [options])

列出分区中的文档（`GET /{db}/_partition/{partition}/_all_docs`）：

```typescript
const docs =
  yield *
  document.partition.list("my-partitioned-db", "canidae", {
    include_docs: true,
    limit: 5,
  });
```

### document.partition.find(db, partition, query)

在分区内执行 Mango 查询（`POST /{db}/_partition/{partition}/_find`）：

```typescript
const result =
  yield *
  document.partition.find("my-partitioned-db", "canidae", {
    selector: { name: "Wolf" },
  });
```

### designDocument.partition.view(db, partition, ddoc, viewname, [options])

在分区内查询视图（`GET /{db}/_partition/{partition}/_design/{ddoc}/_view/{viewname}`）：

```typescript
const result =
  yield * designDocument.partition.view("my-partitioned-db", "canidae", "view-ddoc", "by-name", { limit: 10 });
```

### designDocument.partition.search(db, partition, ddoc, index, [options])

在分区内查询搜索索引。需要 Clouseau 插件：

```typescript
const result =
  yield *
  designDocument.partition.search("my-partitioned-db", "canidae", "search-ddoc", "search-index", { q: "name:'Wolf'" });
```

## LocalDocument 函数

本地文档不会被复制，通过 `LocalDocument` 服务管理。

### localDocument.get(db, docid)

获取本地文档（`GET /{db}/_local/{docid}`）：

```typescript
const doc = yield * localDocument.get("alice", "my-local-doc");
```

### localDocument.exists(db, docid)

检查本地文档是否存在（`HEAD /{db}/_local/{docid}`）。返回布尔值——存在为 `true`，不存在为 `false`：

```typescript
const isPresent = yield * localDocument.exists("alice", "my-local-doc");
```

### localDocument.insert(db, docid, body, [options])

创建或更新本地文档（`PUT /{db}/_local/{docid}`）：

```typescript
const response =
  yield *
  localDocument.insert("alice", "my-local-doc", {
    checkpoint: "abc123",
  });
```

### localDocument.destroy(db, docid, rev)

删除本地文档（`DELETE /{db}/_local/{docid}`）：

```typescript
yield * localDocument.destroy("alice", "my-local-doc", "0-1");
```

### localDocument.list(db)

列出所有本地文档（`GET /{db}/_local_docs`）：

```typescript
const result = yield * localDocument.list("alice");
```

### localDocument.fetch(db, body)

按键获取指定的本地文档（`POST /{db}/_local_docs`）：

```typescript
const result =
  yield *
  localDocument.fetch("alice", {
    keys: ["my-local-doc", "another-local-doc"],
  });
```

## TypeScript

低层 `Document` 服务接受和返回 `unknown`——你可以在不定义 Schema 的情况下自由使用。如需类型安全的文档访问，ceno 提供了 `SchemaDocument` 和 `SchemaLocalDocument`：Schema 感知的封装，**写入时编码**，**读取时解码（并自动迁移）**。

### Schema 文档

以 Effect Schema 字段定义文档结构，然后用 `SchemaDocument.make` 创建类型化的文档访问器：

```typescript
import { Document, SchemaDocument } from "@ceno/core";
import { Effect, Schema } from "effect";

const TodoFields = {
  title: Schema.String,
  done: Schema.Boolean,
};

const program = Effect.gen(function* () {
  const todos = yield* SchemaDocument.make(TodoFields);

  // 写入时进行类型检查——缺少或类型错误的字段会导致编译错误
  yield* todos.put("mydb", "todo-1", { title: "Buy milk", done: false });

  // 读取时完全类型化——`todo` 的类型是 { title: string; done: boolean; _id: string; _rev: string }
  const todo = yield* todos.get("mydb", "todo-1");
  console.log(todo.title); // "Buy milk"
  console.log(todo._rev); // "1-..."

  // find() 也返回类型化的文档
  const result = yield* todos.find("mydb", {
    selector: { done: { $eq: false } },
  });
  result.docs.forEach((doc) => {
    console.log(doc.title, doc.done);
  });

  // bulk() 对数组中的每个文档进行类型检查
  yield* todos.bulk("mydb", [
    { title: "Walk dog", done: false },
    { title: "Read book", done: true },
  ]);
});
```

### 版本迁移

当 Schema 发生变更时，定义一个版本链。`SchemaDocument` 在读取时自动迁移旧文档——无需手动数据迁移：

```typescript
// V1：最初的 Schema
const V1 = { title: Schema.String };

// V2：新增 `priority` 字段——旧文档获得 priority 0
const V2 = {
  from: V1,
  to: { title: Schema.String, priority: Schema.Number },
  migrate: (v1: { readonly title: string }) => ({ title: v1.title, priority: 0 }),
};

// V3：新增 `tags` 字段——旧文档获得空数组
const V3 = {
  from: V2,
  to: { title: Schema.String, priority: Schema.Number, tags: Schema.Array(Schema.String) },
  migrate: (v2: { readonly title: string; readonly priority: number }) => ({
    ...v2,
    tags: [] as readonly string[],
  }),
};

const program = Effect.gen(function* () {
  const docs = yield* SchemaDocument.make(V3);

  // 读取 V1 文档时自动迁移：V1 → V2 → V3
  const doc = yield* docs.get("mydb", "old-doc");
  // doc 的类型是 { title: string; priority: number; tags: readonly string[]; _id: string; _rev: string }
  console.log(doc.priority); // 0（来自 V2 迁移）
  console.log(doc.tags); // []（来自 V3 迁移）
});
```

迁移时先尝试最新的 Schema。如果解码成功，直接返回数据。如果失败，则沿版本链回退，依次应用每个 `migrate` 函数。如果所有版本都不匹配，则返回 `MigrateError`，其中包含每个版本尝试时累积的解码错误。

### 数据库级别变体

向 `SchemaDocument.make` 传入数据库名称，可以获得无需在每次调用时传入 `db` 的访问器：

```typescript
const program = Effect.gen(function* () {
  const todos = yield* SchemaDocument.make(TodoFields, "mydb");

  yield* todos.put("todo-1", { title: "Buy milk", done: false });
  const todo = yield* todos.get("todo-1");
  const result = yield* todos.find({ selector: { done: { $eq: false } } });
});
```

### Schema 本地文档

`SchemaLocalDocument` 以相同方式用于本地（不复制的）文档：

```typescript
import { SchemaLocalDocument } from "@ceno/core";

const program = Effect.gen(function* () {
  const configs = yield* SchemaLocalDocument.make({ checkpoint: Schema.String, lastSync: Schema.Number }, "mydb");

  yield* configs.insert("sync-state", { checkpoint: "abc", lastSync: 1719792000 });
  const state = yield* configs.get("sync-state");
  // state 的类型是 { checkpoint: string; lastSync: number; _id: string; _rev: string }
});
```

## 错误处理

CouchDB 错误映射为标签化错误类。使用 `catchTag` 进行精确的错误处理：

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

## 流式处理

多个方法在传入 `stream: true` 时返回 Effect `Stream` 值，用于处理大型结果集而无需将所有数据加载到内存中：

- `database.changes(name, { ..., stream: true })` — 连续变更源（解析后的变更项流）
- `document.list(db, { ..., stream: true })` — 所有文档（解码文本流）
- `document.find(db, { ..., stream: true })` — Mango 查询结果（解码文本流）
- `document.attachment.get` — 附件字节流
- `designDocument.view(db, ddoc, viewname, { ..., stream: true })` — 视图结果（解码文本流）
- `designDocument.search(db, ddoc, index, { ..., stream: true })` — 搜索结果（解码文本流）

```typescript
import { Stream } from "effect";

const stream =
  yield *
  database.changes("alice", {
    feed: "continuous",
    include_docs: true,
    stream: true,
  });

yield *
  stream.pipe(
    Stream.tap((change) => Effect.log(`变更：${change.id}`)),
    Stream.runDrain,
  );
```

## 测试

```bash
cd ceno
yarn install
yarn test
```

## 许可证

[MIT](../../LICENSE)
