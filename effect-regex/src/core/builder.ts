import type { Ast } from "./ast.js";
import {
  alt,
  anchor,
  backref,
  cls,
  group,
  lit,
  lookahead,
  lookbehind,
  negativeLookahead,
  negativeLookbehind,
  noncap,
  q,
  raw,
  seq,
  tryCapture,
} from "./ast.js";
import { emit as emitPattern } from "./emitter.js";

/**
 * Fluent builder for regex patterns
 * Provides a chainable API for building complex regex ASTs
 */
export class RegexBuilder {
  private constructor(private readonly ast: Ast) {}

  // Static constructors
  /**
   * Create a RegexBuilder from an existing AST
   * Used internally for optimization and transformations
   *
   * @param ast - The AST to wrap
   * @returns A new RegexBuilder instance
   * @example
   * ```typescript
   * const ast = seq(lit("hello"), lit("world"));
   * const builder = RegexBuilder.fromAst(ast);
   * ```
   */
  static fromAst(ast: Ast): RegexBuilder {
    return new RegexBuilder(ast);
  }

  /**
   * Create a pattern that matches a literal string
   * Special regex characters are automatically escaped
   *
   * @param value - The literal string to match
   * @returns A new RegexBuilder instance
   * @example
   * ```typescript
   * RegexBuilder.lit("hello.world") // Matches the literal text "hello.world"
   * ```
   */
  static lit(value: string): RegexBuilder {
    return new RegexBuilder(lit(value));
  }

  /**
   * Create a pattern from a raw regex string (no escaping)
   * Use this when you need to include raw regex syntax
   *
   * @param pattern - The raw regex pattern
   * @returns A new RegexBuilder instance
   * @example
   * ```typescript
   * RegexBuilder.raw("\d{3}") // Matches exactly 3 digits
   * ```
   */
  static raw(pattern: string): RegexBuilder {
    return new RegexBuilder(raw(pattern));
  }

  // Sequence building
  /**
   * Chain this pattern with another pattern in sequence
   *
   * @param value - The pattern to append (string or RegexBuilder)
   * @returns A new RegexBuilder with the combined pattern
   * @example
   * ```typescript
   * RegexBuilder.lit("hello").then(" ").then("world")
   * // Matches "hello world"
   * ```
   */
  then(value: string | RegexBuilder): RegexBuilder {
    const other = typeof value === "string" ? RegexBuilder.lit(value) : value;
    if (this.ast.type === "seq") {
      return new RegexBuilder(seq(...this.ast.children, other.ast));
    }
    return new RegexBuilder(seq(this.ast, other.ast));
  }

  // Alternation building
  /**
   * Create an alternation with this pattern OR another pattern
   *
   * @param value - The alternative pattern (string or RegexBuilder)
   * @returns A new RegexBuilder matching either pattern
   * @example
   * ```typescript
   * RegexBuilder.lit("cat").or("dog")
   * // Matches either "cat" or "dog"
   * ```
   */
  or(value: string | RegexBuilder): RegexBuilder {
    const other = typeof value === "string" ? RegexBuilder.lit(value) : value;
    if (this.ast.type === "alt") {
      return new RegexBuilder(alt(...this.ast.children, other.ast));
    }
    return new RegexBuilder(alt(this.ast, other.ast));
  }

  // Static alternation method
  /**
   * Create an alternation from multiple patterns
   *
   * @param builders - Patterns to match (any one of them)
   * @returns A new RegexBuilder matching any of the patterns
   * @example
   * ```typescript
   * RegexBuilder.alt("red", "green", "blue")
   * // Matches "red" or "green" or "blue"
   * ```
   */
  static alt(...builders: (string | RegexBuilder)[]): RegexBuilder {
    const asts = builders.map((b) =>
      typeof b === "string" ? RegexBuilder.lit(b).ast : b.ast
    );
    return new RegexBuilder(alt(...asts));
  }

  // Character classes
  static charClass(chars: string, negated = false): RegexBuilder {
    return new RegexBuilder(cls(chars, negated));
  }

  // Groups (non-capturing by default)
  group(name?: string): RegexBuilder {
    return new RegexBuilder(name ? group(this.ast, name) : noncap(this.ast));
  }

  capture(name?: string): RegexBuilder {
    return new RegexBuilder(group(this.ast, name));
  }

  // TryCapture - capture with validation metadata
  tryCapture(
    name?: string,
    validation?: { description: string; pattern?: string }
  ): RegexBuilder {
    return new RegexBuilder(tryCapture(this.ast, name, validation));
  }

  // Backreferences
  backreference(target: string | number): RegexBuilder {
    return new RegexBuilder(backref(target));
  }

  static backref(target: string | number): RegexBuilder {
    return new RegexBuilder(backref(target));
  }

  // Assertions (lookahead/lookbehind) - instance methods
  // Note: These are typically used as standalone assertions, not chained
  // For most use cases, use the static methods instead
  lookahead(pattern: RegexBuilder): RegexBuilder {
    // This pattern followed by a lookahead
    return this.then(RegexBuilder.lookahead(pattern));
  }

  lookbehind(pattern: RegexBuilder): RegexBuilder {
    // Lookbehind assertion followed by this pattern
    return RegexBuilder.lookbehind(pattern).then(this);
  }

  negativeLookahead(pattern: RegexBuilder): RegexBuilder {
    // This pattern followed by a negative lookahead
    return this.then(RegexBuilder.negativeLookahead(pattern));
  }

  negativeLookbehind(pattern: RegexBuilder): RegexBuilder {
    // Negative lookbehind assertion followed by this pattern
    return RegexBuilder.negativeLookbehind(pattern).then(this);
  }

  // Quantifiers
  /**
   * Match this pattern zero or more times (*)
   *
   * @param lazy - If true, match as few characters as possible (lazy quantifier)
   * @returns A new RegexBuilder with quantifier applied
   * @example
   * ```typescript
   * RegexBuilder.digit().zeroOrMore() // Matches "", "1", "123", etc.
   * ```
   */
  zeroOrMore(lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, 0, null, lazy));
  }

  /**
   * Match this pattern one or more times (+)
   *
   * @param lazy - If true, match as few characters as possible (lazy quantifier)
   * @returns A new RegexBuilder with quantifier applied
   * @example
   * ```typescript
   * RegexBuilder.digit().oneOrMore() // Matches "1", "123", but not ""
   * ```
   */
  oneOrMore(lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, 1, null, lazy));
  }

  /**
   * Match this pattern zero or one time (?)
   *
   * @param lazy - If true, match as few characters as possible (lazy quantifier)
   * @returns A new RegexBuilder with quantifier applied
   * @example
   * ```typescript
   * RegexBuilder.lit("s").optional() // Matches "" or "s"
   * ```
   */
  optional(lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, 0, 1, lazy));
  }

  /**
   * Match this pattern exactly n times ({n})
   *
   * @param n - The exact number of times to match
   * @returns A new RegexBuilder with quantifier applied
   * @example
   * ```typescript
   * RegexBuilder.digit().exactly(3) // Matches exactly 3 digits like "123"
   * ```
   */
  exactly(n: number): RegexBuilder {
    return new RegexBuilder(q(this.ast, n, n));
  }

  /**
   * Match this pattern at least n times ({n,})
   *
   * @param n - The minimum number of times to match
   * @param lazy - If true, match as few characters as possible (lazy quantifier)
   * @returns A new RegexBuilder with quantifier applied
   * @example
   * ```typescript
   * RegexBuilder.digit().atLeast(2) // Matches "12", "123", "1234", etc.
   * ```
   */
  atLeast(n: number, lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, n, null, lazy));
  }

  /**
   * Match this pattern between min and max times ({min,max})
   *
   * @param min - The minimum number of times to match
   * @param max - The maximum number of times to match
   * @param lazy - If true, match as few characters as possible (lazy quantifier)
   * @returns A new RegexBuilder with quantifier applied
   * @example
   * ```typescript
   * RegexBuilder.digit().between(2, 4) // Matches "12", "123", or "1234"
   * ```
   */
  between(min: number, max: number, lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, min, max, lazy));
  }

  // Anchors
  startOfLine(): RegexBuilder {
    return new RegexBuilder(anchor("start")).then(this);
  }

  endOfLine(): RegexBuilder {
    return this.then(new RegexBuilder(anchor("end")));
  }

  wordBoundary(): RegexBuilder {
    return this.then(new RegexBuilder(anchor("word")));
  }

  // Common patterns
  /**
   * Match any digit character (0-9)
   * Equivalent to \d or [0-9]
   *
   * @returns A new RegexBuilder matching digits
   * @example
   * ```typescript
   * RegexBuilder.digit().oneOrMore() // Matches "123", "0", etc.
   * ```
   */
  static digit(): RegexBuilder {
    return RegexBuilder.charClass("0-9");
  }

  /**
   * Match any word character (a-zA-Z0-9_)
   * Equivalent to \w or [a-zA-Z0-9_]
   *
   * @returns A new RegexBuilder matching word characters
   * @example
   * ```typescript
   * RegexBuilder.word().oneOrMore() // Matches "hello", "test_123", etc.
   * ```
   */
  static word(): RegexBuilder {
    return RegexBuilder.charClass("a-zA-Z0-9_");
  }

  /**
   * Match any whitespace character (space, tab, newline, etc.)
   * Equivalent to \s
   *
   * @returns A new RegexBuilder matching whitespace
   * @example
   * ```typescript
   * RegexBuilder.whitespace().oneOrMore() // Matches "  ", "\t", "\n", etc.
   * ```
   */
  static whitespace(): RegexBuilder {
    return RegexBuilder.charClass("\\s");
  }

  /**
   * Match any character (except newline in most modes)
   * Equivalent to .
   *
   * @returns A new RegexBuilder matching any character
   * @example
   * ```typescript
   * RegexBuilder.any().exactly(3) // Matches any 3 characters
   * ```
   */
  static any(): RegexBuilder {
    return RegexBuilder.raw(".");
  }

  // Static assertion constructors
  // biome-ignore lint/suspicious/useAdjacentOverloadSignatures: instance and static methods with same names are intentionally separate
  static lookahead(pattern: RegexBuilder): RegexBuilder {
    return new RegexBuilder(lookahead(pattern.ast));
  }

  static lookbehind(pattern: RegexBuilder): RegexBuilder {
    return new RegexBuilder(lookbehind(pattern.ast));
  }

  static negativeLookahead(pattern: RegexBuilder): RegexBuilder {
    return new RegexBuilder(negativeLookahead(pattern.ast));
  }

  static negativeLookbehind(pattern: RegexBuilder): RegexBuilder {
    return new RegexBuilder(negativeLookbehind(pattern.ast));
  }

  // Get the AST
  /**
   * Get the underlying AST representation of this pattern
   *
   * @returns The AST node for this pattern
   * @example
   * ```typescript
   * const builder = RegexBuilder.digit().oneOrMore();
   * const ast = builder.getAst();
   * // Access the AST structure directly
   * ```
   */
  getAst(): Ast {
    return this.ast;
  }

  // Clone for branching
  /**
   * Create a copy of this builder for branching pattern development
   *
   * @returns A new RegexBuilder with the same AST
   * @example
   * ```typescript
   * const base = RegexBuilder.lit("prefix");
   * const variant1 = base.clone().then("A");
   * const variant2 = base.clone().then("B");
   * ```
   */
  clone(): RegexBuilder {
    return new RegexBuilder(this.ast);
  }
}

/**
 * Convenience functions for common patterns
 */
export const regex = RegexBuilder.lit;

export const digit = RegexBuilder.digit;
export const word = RegexBuilder.word;
export const whitespace = RegexBuilder.whitespace;
export const any = RegexBuilder.any;

/**
 * Builder result type
 */
export interface RegexPattern {
  readonly pattern: string;
  readonly ast: Ast;
  readonly notes: readonly string[];
  readonly captureMap?: Record<string, number | number[]>;
}

/**
 * Emit the regex pattern with dialect support
 *
 * Converts a RegexBuilder to a regex pattern string with dialect-specific features.
 * Includes AST, notes (warnings/info), and capture group mapping.
 *
 * @param builder - The RegexBuilder to emit
 * @param dialect - Target regex dialect ("js", "re2", or "pcre")
 * @param shouldAnchor - If true, wrap pattern in ^...$ anchors
 * @returns RegexPattern with pattern string, AST, notes, and capture map
 *
 * @example
 * ```typescript
 * const builder = RegexBuilder.digit().exactly(3);
 * const result = emit(builder, "js");
 * console.log(result.pattern); // "\d{3}"
 * ```
 */
export const emit = (
  builder: RegexBuilder,
  dialect: "js" | "re2" | "pcre" = "js",
  shouldAnchor = false
): RegexPattern => emitPattern(builder, dialect, shouldAnchor);
