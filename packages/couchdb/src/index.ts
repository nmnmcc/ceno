import { Layer } from "effect";

import { DatabaseLayer } from "./database";
import { DesignDocumentLayer } from "./design-document";
import { DocumentLayer } from "./document";
import { LocalDocumentLayer } from "./local-document";
import { ServerLayer } from "./server";

export * from "@ceno/core";
export * from "./client";
export * from "./errors";
export * from "./server";
export * from "./database";
export * from "./document";
export * from "./design-document";
export * from "./local-document";

/** Every CouchDB-backed @ceno/core service implementation merged into one layer; still requires a {@link CouchDbClient} (see `CouchDbClient.layer`) and an `HttpClient` to run. */
export const layer = Layer.mergeAll(ServerLayer, DatabaseLayer, DocumentLayer, DesignDocumentLayer, LocalDocumentLayer);
