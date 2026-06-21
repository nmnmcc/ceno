import { Context, type Effect } from "effect";

import type {
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListResponse,
} from "./document";
import type {
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./errors";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Local document operations. Local documents are not replicated. */
export class LocalDocument extends Context.Service<LocalDocument, LocalDocument.LocalDocument>()(
  "@ceno/core/LocalDocument",
) {}

export namespace LocalDocument {
  /** Service shape for local document operations. */
  export interface LocalDocument {
    /** Retrieves a local document by ID. */
    readonly get: (
      db: string,
      docid: string,
    ) => Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoNotFound | TransportError>;
    /** Checks whether a local document exists. */
    readonly exists: (
      db: string,
      docid: string,
    ) => Effect.Effect<boolean, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Creates or updates a local document. */
    readonly insert: (
      db: string,
      docid: string,
      body: unknown,
      options?: { readonly rev?: string },
    ) => Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Deletes a local document. */
    readonly destroy: (
      db: string,
      docid: string,
      rev: string,
    ) => Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoNotFound | CenoConflict | TransportError
    >;
    /** Lists all local documents. */
    readonly list: (
      db: string,
    ) => Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Fetches specific local documents by keys. */
    readonly fetch: (
      db: string,
      body: unknown,
    ) => Effect.Effect<DocumentFetchResponse, CenoUnauthorized | CenoForbidden | TransportError>;
  }
}
