import { HttpApi } from "effect/unstable/httpapi";

import { DatabaseApi } from "./database.js";
import { DocumentApi } from "./document.js";
import { ServerApi } from "./server.js";

/** Full CouchDB REST API definition. */
export const CouchDbApi = HttpApi.make("couchdb").add(ServerApi, DatabaseApi, DocumentApi);
