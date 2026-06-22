import { Layer } from "effect";

import * as Database from "./Database.ts";
import * as DesignDocument from "./DesignDocument.ts";
import * as Document from "./Document.ts";
import * as LocalDocument from "./LocalDocument.ts";
import * as Server from "./Server.ts";

/** Every CouchDB-backed @ceno/core service implementation merged into one layer; still requires a CouchDbClient (see `Client.layer`) and an `HttpClient` to run. */
export const layer = Layer.mergeAll(
  Server.layer,
  Database.layer,
  Document.layer,
  DesignDocument.layer,
  LocalDocument.layer,
);
