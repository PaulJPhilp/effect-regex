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
  static lit(value: string): RegexBuilder {
    return new RegexBuilder(lit(value));
  }

  static raw(pattern: string): RegexBuilder {
    return new RegexBuilder(raw(pattern));
  }

  // Sequence building
  then(value: string | RegexBuilder): RegexBuilder {
    const other = typeof value === "string" ? RegexBuilder.lit(value) : value;
    if (this.ast.type === "seq") {
      return new RegexBuilder(seq(...this.ast.children, other.ast));
    }
    return new RegexBuilder(seq(this.ast, other.ast));
  }

  // Alternation building
  or(value: string | RegexBuilder): RegexBuilder {
    const other = typeof value === "string" ? RegexBuilder.lit(value) : value;
    if (this.ast.type === "alt") {
      return new RegexBuilder(alt(...this.ast.children, other.ast));
    }
    return new RegexBuilder(alt(this.ast, other.ast));
  }

  // Static alternation method
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
  zeroOrMore(lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, 0, null, lazy));
  }

  oneOrMore(lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, 1, null, lazy));
  }

  optional(lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, 0, 1, lazy));
  }

  exactly(n: number): RegexBuilder {
    return new RegexBuilder(q(this.ast, n, n));
  }

  atLeast(n: number, lazy = false): RegexBuilder {
    return new RegexBuilder(q(this.ast, n, null, lazy));
  }

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
  static digit(): RegexBuilder {
    return RegexBuilder.charClass("0-9");
  }

  static word(): RegexBuilder {
    return RegexBuilder.charClass("a-zA-Z0-9_");
  }

  static whitespace(): RegexBuilder {
    return RegexBuilder.charClass("\\s");
  }

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
  getAst(): Ast {
    return this.ast;
  }

  // Clone for branching
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
 */
export const emit = (
  builder: RegexBuilder,
  dialect: "js" | "re2" | "pcre" = "js",
  shouldAnchor = false
): RegexPattern => emitPattern(builder, dialect, shouldAnchor);
