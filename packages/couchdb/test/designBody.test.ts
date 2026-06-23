import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect } from "effect";

import { encodeDesignBody } from "../src/internal/designBody.ts";

describe("encodeDesignBody", () => {
  it.effect("strips the outermost `this.` and minifies inline functions", () =>
    Effect.gen(function* () {
      const wire = yield* encodeDesignBody({
        views: {
          by_category: {
            map: function (doc: { category: string }) {
              this.emit(doc.category, 1);
            },
            reduce: "_sum",
          },
        },
      });
      const json = JSON.stringify(wire);
      strictEqual(json.includes("this."), false); // outermost this rewritten away
      strictEqual(json.includes("emit(doc.category"), true); // bare global call (minified drops spaces)
      strictEqual(json.includes("_sum"), true); // built-in reducer name passed through
    }),
  );

  it.effect("keeps `this` inside nested non-arrow functions", () =>
    Effect.gen(function* () {
      const wire = yield* encodeDesignBody({
        validate_doc_update: function (newDoc) {
          const helper = function (this: { ok: boolean }) {
            return this.ok;
          };
          this.log(newDoc);
          return helper;
        },
      });
      const json = JSON.stringify(wire);
      strictEqual(json.includes("log(newDoc)"), true); // outer this stripped
      strictEqual(json.includes("this.ok"), true); // nested function's own this preserved
    }),
  );

  it.effect("passes string functions through untouched (no Babel needed)", () =>
    Effect.gen(function* () {
      const wire = yield* encodeDesignBody({
        filters: { mine: "function (doc) { return doc.mine; }" },
      });
      strictEqual(JSON.stringify(wire).includes("function (doc) { return doc.mine; }"), true);
    }),
  );
});
