import type { DesignDocumentBody } from "@ceno/core/DesignDocument";
import { Effect } from "effect";

// A design document's map/reduce/filter/update/validate functions reach CouchDB's query server as
// JSON strings. ceno lets you author them as real functions that use `this.emit`/`this.sum`/`this.log`
// for type-safe access to the query-server globals (no global declarations to pollute the project).
// Before a body is PUT, those functions are serialized: the outermost `this.x` is rewritten to the
// bare `x` the query server expects, then the source is minified. This is CouchDB-specific — a
// PouchDB backend runs functions in-process and never stringifies — so it lives here in @ceno/couchdb,
// not in the backend-agnostic @ceno/core.

// Walk once to decide whether Babel is needed at all; string-only (or function-free) bodies skip it.
const hasFunction = (value: unknown): boolean =>
  typeof value === "function"
    ? true
    : Array.isArray(value)
      ? value.some(hasFunction)
      : typeof value === "object" && value !== null
        ? Object.values(value).some(hasFunction)
        : false;

// @babel/traverse is CJS; Node ESM wraps its default export one level deeper (`{ default: fn }`).
// The `@types` model only the ESM shape; the lone `as` bridges that runtime-only quirk.
const interopDefault = <T>(value: T): T =>
  value && typeof value === "object" && "default" in value ? (value.default as T) : value;

/**
 * Serializes a design-document body for CouchDB: every inline function (map, reduce, update, filter,
 * validator) becomes a `this`-stripped, minified source string; strings pass through untouched. Babel
 * is imported lazily — only the first time a body actually contains a function — so @ceno/couchdb
 * carries no eager Babel cost and apps that only ever use string functions never load it.
 */
export const encodeDesignBody = <T>(body: DesignDocumentBody<T>): Effect.Effect<unknown> => {
  if (!hasFunction(body)) return Effect.succeed(body);
  return Effect.promise(async () => {
    const [
      { parse },
      traverseModule,
      { generate },
      { isThisExpression, isIdentifier, isStringLiteral, isExpressionStatement, identifier },
    ] = await Promise.all([
      import("@babel/parser"),
      import("@babel/traverse"),
      import("@babel/generator"),
      import("@babel/types"),
    ]);
    // @babel/traverse is CJS; Node ESM wraps its default export one level deeper (`{ default: fn }`).
    const traverse = interopDefault(traverseModule.default);

    // Rewrite the outermost function's `this.x` → `x`. Nested non-arrow functions rebind `this`,
    // so theirs is left untouched. Then minify.
    const stripThisAndMinify = (source: string): string => {
      // Wrap in parens so an anonymous `function (…) {}` source parses as an expression.
      const file = parse(`(${source})`, { sourceType: "module", plugins: ["typescript"] });
      // depth 0 is the serialized function's own body; a `let` is disallowed, so track it on an object.
      const scopeDepth = { value: -1 };
      const scope = {
        enter: () => {
          scopeDepth.value += 1;
        },
        exit: () => {
          scopeDepth.value -= 1;
        },
      };
      traverse(file, {
        FunctionExpression: scope,
        FunctionDeclaration: scope,
        ObjectMethod: scope,
        ClassMethod: scope,
        MemberExpression(path) {
          if (scopeDepth.value !== 0 || !isThisExpression(path.node.object)) return;
          const property = path.node.property;
          if (!path.node.computed && isIdentifier(property)) {
            path.replaceWith(identifier(property.name));
          } else if (path.node.computed && isStringLiteral(property)) {
            path.replaceWith(identifier(property.value));
          }
        },
      });
      const statement = file.program.body[0];
      const fn = statement && isExpressionStatement(statement) ? statement.expression : file;
      return generate(fn, { minified: true, comments: false }).code;
    };

    // Recursively replace function values with their (this-stripped, minified) source; everything
    // else passes through. Bodies are plain JSON-shaped data, so a naive walk is enough.
    const functionsToSource = (value: unknown): unknown =>
      typeof value === "function"
        ? stripThisAndMinify(value.toString())
        : Array.isArray(value)
          ? value.map(functionsToSource)
          : typeof value === "object" && value !== null
            ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, functionsToSource(child)]))
            : value;

    return functionsToSource(body);
  });
};
