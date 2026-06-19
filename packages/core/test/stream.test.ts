import { parseNdjsonStream } from "@ceno/core";
import { describe, it } from "@effect/vitest";
import { strictEqual } from "@effect/vitest/utils";
import { Effect, Schema, Stream } from "effect";

const ItemSchema = Schema.Struct({
  id: Schema.String,
  seq: Schema.Number,
});

const encode = (text: string) => new TextEncoder().encode(text);

describe("parseNdjsonStream", () => {
  it.effect("parses a single NDJSON line", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode('{"id":"a","seq":1}\n'));
      const items = yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect);
      strictEqual(items.length, 1);
      strictEqual(items[0]!.id, "a");
      strictEqual(items[0]!.seq, 1);
    }),
  );

  it.effect("parses multiple NDJSON lines", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode('{"id":"a","seq":1}\n{"id":"b","seq":2}\n{"id":"c","seq":3}\n'));
      const items = yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect);
      strictEqual(items.length, 3);
      strictEqual(items[0]!.id, "a");
      strictEqual(items[1]!.id, "b");
      strictEqual(items[2]!.id, "c");
    }),
  );

  it.effect("skips empty lines between entries", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode('{"id":"a","seq":1}\n\n\n{"id":"b","seq":2}\n'));
      const items = yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect);
      strictEqual(items.length, 2);
    }),
  );

  it.effect("handles chunked input split across boundaries", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode('{"id":"a",'), encode('"seq":1}\n{"id":"b"'), encode(',"seq":2}\n'));
      const items = yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect);
      strictEqual(items.length, 2);
      strictEqual(items[0]!.id, "a");
      strictEqual(items[1]!.id, "b");
    }),
  );

  it.effect("fails with SchemaError on invalid JSON structure", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode('{"id":"a","seq":"not_a_number"}\n'));
      yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect).pipe(
        Effect.andThen(Effect.die("Expected SchemaError")),
        Effect.catchTag("SchemaError", () => Effect.void),
      );
    }),
  );

  it.effect("produces an empty stream from empty input", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode(""));
      const items = yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect);
      strictEqual(items.length, 0);
    }),
  );

  it.effect("handles trailing newline without extra empty element", () =>
    Effect.gen(function* () {
      const stream = Stream.make(encode('{"id":"x","seq":99}\n'));
      const items = yield* stream.pipe(parseNdjsonStream(ItemSchema), Stream.runCollect);
      strictEqual(items.length, 1);
    }),
  );
});
