import { Schema, Stream } from "effect";

/** Parse an NDJSON byte stream into schema-validated elements. Used for continuous feeds such as database changes. */
export const parseNdjsonStream =
  <S extends Schema.Top>(schema: S) =>
  <E, R>(
    stream: Stream.Stream<Uint8Array, E, R>,
  ): Stream.Stream<S["Type"], E | Schema.SchemaError, R | S["DecodingServices"]> =>
    stream.pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.filter((line) => line.length > 0),
      Stream.mapEffect((line) => Schema.decodeUnknownEffect(schema)(JSON.parse(line))),
    );
