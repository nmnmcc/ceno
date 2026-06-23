import { Context, type Effect } from "effect";

import type {
  DocumentDestroyResponse,
  DocumentFetchResponse,
  DocumentInsertResponse,
  DocumentListParams,
  DocumentListResponse,
} from "./Document.ts";
import type {
  CenoBadRequest,
  CenoConflict,
  CenoForbidden,
  CenoNotFound,
  CenoUnauthorized,
  TransportError,
} from "./Errors.ts";

/** Local document operations. Local documents are not replicated. */
export class LocalDocument extends Context.Service<LocalDocument, LocalDocument.LocalDocument>()(
  "@ceno/core/LocalDocument",
) {}

export namespace LocalDocument {
  /** Service shape for local document operations. */
  export interface LocalDocument {
    /** Retrieves a local document by ID. */
    get(
      db: string,
      docid: string,
    ): Effect.Effect<unknown, CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | TransportError>;
    /** Checks whether a local document exists. */
    exists(db: string, docid: string): Effect.Effect<boolean, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Creates or updates a local document. */
    insert(
      db: string,
      docid: string,
      body: unknown,
      options?: { readonly rev?: string | undefined },
    ): Effect.Effect<
      DocumentInsertResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Deletes a local document. */
    destroy(
      db: string,
      docid: string,
      rev: string | undefined,
    ): Effect.Effect<
      DocumentDestroyResponse,
      CenoBadRequest | CenoUnauthorized | CenoForbidden | CenoNotFound | CenoConflict | TransportError
    >;
    /** Lists all local documents. Accepts the same listing options as `_all_docs`. */
    list(
      db: string,
      options?: DocumentListParams,
    ): Effect.Effect<DocumentListResponse, CenoUnauthorized | CenoForbidden | TransportError>;
    /** Fetches specific local documents by keys. */
    fetch(
      db: string,
      body: unknown,
    ): Effect.Effect<DocumentFetchResponse, CenoUnauthorized | CenoForbidden | TransportError>;
  }
}
