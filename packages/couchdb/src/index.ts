import { Layer } from "effect";

import { CouchDbDatabase } from "./services/database";
import { CouchDbDesignDocument } from "./services/design-document";
import { CouchDbDocument } from "./services/document";
import { CouchDbLocalDocument } from "./services/local-document";
import { CouchDbServer } from "./services/server";

export * from "./services";

/** Every CouchDB-backed @ceno/core service implementation merged into one layer; still requires a {@link CouchDbClient} (see `CouchDbClient.layer`) and an `HttpClient` to run. */
export const layer = Layer.mergeAll(
  CouchDbServer.layer,
  CouchDbDatabase.layer,
  CouchDbDocument.layer,
  CouchDbDesignDocument.layer,
  CouchDbLocalDocument.layer,
);
