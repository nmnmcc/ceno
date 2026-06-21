# @ceno/schema

为 [ceno](https://github.com/nmnmcc/ceno) 提供 Schema 感知、带版本迁移的文档操作 —— 一个基于 [Effect](https://effect.website) 构建的类型安全 CouchDB 客户端。

[`@ceno/core`](../core) 中的底层 `Document` 和 `LocalDocument` 服务接受和返回 `unknown`。本包在其之上提供类型化访问：`SchemaDocument` 和 `SchemaLocalDocument` 是 Schema 感知的封装，**写入时编码**，**读取时解码（并自动迁移）**。它们由版本链构建，并从 Effect 上下文中解析底层的 `@ceno/core` 服务——因此你仍像往常一样提供后端层（如 [`@ceno/couchdb`](../couchdb)）。

## 安装

```bash
npm install @ceno/schema @ceno/core effect
```

## 目录

- [SchemaDocument](#schemadocument)
  - [数据库级别变体](#数据库级别变体)
- [SchemaLocalDocument](#schemalocaldocument)
- [版本迁移](#版本迁移)
  - [Version API](#version-api)
- [许可证](#许可证)

## SchemaDocument

以 Effect Schema 字段定义文档结构，然后用 `SchemaDocument.make` 创建类型化的访问器。它会从上下文中解析 `Document`，因此运行程序时需提供后端层。

```typescript
import { Document } from "@ceno/core";
import { SchemaDocument } from "@ceno/schema";
import { Effect, Schema } from "effect";

const TodoFields = {
  title: Schema.String,
  done: Schema.Boolean,
};

const program = Effect.gen(function* () {
  const todos = yield* SchemaDocument.make(TodoFields);

  // 写入时进行类型检查
  yield* todos.put("mydb", "todo-1", { title: "Buy milk", done: false });

  // 读取时完全类型化——`todo` 的类型是 { title: string; done: boolean; _id: string; _rev: string }
  const todo = yield* todos.get("mydb", "todo-1");

  // find() 也返回类型化的文档
  const result = yield* todos.find("mydb", {
    selector: { done: { $eq: false } },
  });

  // bulk() 对数组中的每个文档进行类型检查
  yield* todos.bulk("mydb", [
    { title: "Walk dog", done: false },
    { title: "Read book", done: true },
  ]);
});
```

`SchemaDocument` 上的可用方法：

| 方法                             | 说明                            |
| -------------------------------- | ------------------------------- |
| `get(db, docid, options?)`       | 获取并解码文档                  |
| `insert(db, body, options?)`     | 编码并插入文档                  |
| `put(db, docid, body, options?)` | 编码并创建/更新文档             |
| `find(db, query)`                | 执行 Mango 查询并返回类型化结果 |
| `bulk(db, docs)`                 | 批量插入并进行类型检查          |
| `in(db)`                         | 将所有方法限定到单个数据库      |

### 数据库级别变体

调用 `.in(db)` 可以获得无需在每次调用时传入 `db` 的访问器：

```typescript
const program = Effect.gen(function* () {
  const todos = (yield* SchemaDocument.make(TodoFields)).in("mydb");

  yield* todos.put("todo-1", { title: "Buy milk", done: false });
  const todo = yield* todos.get("todo-1");
  const result = yield* todos.find({ selector: { done: { $eq: false } } });
});
```

## SchemaLocalDocument

`SchemaLocalDocument` 以相同方式用于本地（不复制的）文档，并从上下文中解析 `LocalDocument`：

```typescript
import { LocalDocument } from "@ceno/core";
import { SchemaLocalDocument } from "@ceno/schema";
import { Effect, Schema } from "effect";

const ConfigFields = { checkpoint: Schema.String, lastSync: Schema.Number };

const program = Effect.gen(function* () {
  const configs = (yield* SchemaLocalDocument.make(ConfigFields)).in("mydb");

  yield* configs.insert("sync-state", { checkpoint: "abc", lastSync: 1719792000 });
  const state = yield* configs.get("sync-state");
  // state 的类型是 { checkpoint: string; lastSync: number; _id: string; _rev: string }
});
```

`SchemaLocalDocument` 上的可用方法：

| 方法                                | 说明                       |
| ----------------------------------- | -------------------------- |
| `get(db, docid)`                    | 获取并解码本地文档         |
| `insert(db, docid, body, options?)` | 编码并创建/更新本地文档    |
| `in(db)`                            | 将所有方法限定到单个数据库 |

## 版本迁移

当 Schema 发生变更时，定义一个版本链。`SchemaDocument` 在读取时自动迁移旧文档——无需手动数据迁移：

```typescript
import { SchemaDocument, version } from "@ceno/schema";
import { Effect, Schema } from "effect";

// V1：最初的 Schema
const V1 = version({ title: Schema.String });

// V2：新增 `priority` 字段——旧文档获得 priority 0
const V2 = version({
  from: V1,
  to: { title: Schema.String, priority: Schema.Number },
  migrate: (v1) => ({ title: v1.title, priority: 0 }),
});

// V3：新增 `tags` 字段——旧文档获得空数组
const V3 = version({
  from: V2,
  to: { title: Schema.String, priority: Schema.Number, tags: Schema.Array(Schema.String) },
  migrate: (v2) => ({ ...v2, tags: [] as readonly string[] }),
});

const program = Effect.gen(function* () {
  const docs = yield* SchemaDocument.make(V3);

  // 读取 V1 文档时自动迁移：V1 → V2 → V3
  const doc = yield* docs.get("mydb", "old-doc");
  console.log(doc.priority); // 0（来自 V2 迁移）
  console.log(doc.tags); // []（来自 V3 迁移）
});
```

迁移时先尝试最新的 Schema。如果解码成功，直接返回数据。如果失败，则沿版本链回退，依次应用每个 `migrate` 函数。如果所有版本都不匹配，则返回 `MigrateError`，其中包含每个版本尝试时累积的解码错误。

### Version API

| 导出                           | 说明                                                  |
| ------------------------------ | ----------------------------------------------------- |
| `version(fields \| migration)` | 从普通字段或迁移定义 `{ from, to, migrate }` 创建版本 |
| `migrate(data, version)`       | 通过版本链解码数据，按需应用迁移                      |
| `toSchema(version)`            | 将版本转换为 Effect `Schema`                          |
| `isMigrateVersion(v)`          | `MigrateVersion` 的类型守卫                           |
| `MigrateError`                 | 包含所有版本累积解码错误的标签化错误                  |

## 许可证

Apache-2.0
