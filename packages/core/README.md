# @ceno/core

Backend-agnostic service contracts, schemas, and errors for [ceno](https://github.com/nmnmcc/ceno).

为 [ceno](https://github.com/nmnmcc/ceno) 提供后端无关的服务契约、Schema 和错误类型。

## Install / 安装

```bash
npm install @ceno/core effect
```

## Overview / 概览

This package defines the service interfaces that backend implementations (like `@ceno/couchdb`) must fulfill. It contains no implementation code — only contracts, schemas, and error types.

此包定义了后端实现（如 `@ceno/couchdb`）需要满足的服务接口。仅包含契约、Schema 和错误类型，不包含实现代码。

### Services / 服务

- **`Server`** — server metadata, UUIDs, authentication / 服务器元数据、UUID、认证
- **`Database`** — database management, changes feed, replication / 数据库管理、变更订阅、复制
- **`Document`** — document CRUD, bulk operations, Mango queries / 文档 CRUD、批量操作、Mango 查询
- **`DesignDocument`** — design document CRUD, view queries / 设计文档 CRUD、视图查询
- **`LocalDocument`** — local (non-replicated) document CRUD / 本地（非复制）文档 CRUD

### Errors / 错误类型

All errors extend `TaggedErrorClass` for type-safe `catchTag` matching:

所有错误继承 `TaggedErrorClass`，支持类型安全的 `catchTag` 匹配：

`CenoNotFound`, `CenoConflict`, `CenoUnauthorized`, `CenoForbidden`, `CenoBadRequest`, `CenoAlreadyExists`, `CenoIllegalDatabaseName`, `CenoBadContentType`, `CenoInternalServerError`

### Utilities / 工具

- **`parseNDJsonStream`** — parses newline-delimited JSON streams into typed Effect streams / 将 NDJSON 流解析为类型化的 Effect Stream
- **`VersionStamped`** — schema versioning helper / Schema 版本标记辅助工具

## License

[MIT](../../LICENSE)
