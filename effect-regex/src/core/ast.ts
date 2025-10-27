/**
 * Core AST types for the regex builder
 *
 * This module provides a type-safe Abstract Syntax Tree representation for regex patterns.
 * All regex patterns are represented as immutable AST nodes that can be analyzed, optimized,
 * and emitted to different regex dialects.
 *
 * @module core/ast
 */

/**
 * Base interface for all AST nodes
 * All nodes have a discriminated union type field for type-safe pattern matching
 */
export interface AstNode {
  readonly type: string;
}

/**
 * Literal string node - matches exact text with automatic escaping
 *
 * @example
 * ```typescript
 * const node: LitNode = { type: "lit", value: "hello\\.world" };
 * // Matches the literal text "hello.world"
 * ```
 */
export interface LitNode extends AstNode {
  readonly type: "lit";
  /** The literal string value (regex special chars are escaped) */
  readonly value: string;
}

/**
 * Raw regex pattern node - matches using raw regex syntax (no escaping)
 *
 * @example
 * ```typescript
 * const node: RawNode = { type: "raw", pattern: "\\d{3}" };
 * // Matches exactly 3 digits
 * ```
 */
export interface RawNode extends AstNode {
  readonly type: "raw";
  /** The raw regex pattern string */
  readonly pattern: string;
}

/**
 * Sequence node - matches patterns in order (concatenation)
 *
 * @example
 * ```typescript
 * const node: SeqNode = {
 *   type: "seq",
 *   children: [
 *     { type: "lit", value: "hello" },
 *     { type: "lit", value: " " },
 *     { type: "lit", value: "world" }
 *   ]
 * };
 * // Matches "hello world"
 * ```
 */
export interface SeqNode extends AstNode {
  readonly type: "seq";
  /** Child patterns to match in sequence */
  readonly children: readonly AstNode[];
}

/**
 * Alternation node - matches any one of the alternatives (OR)
 *
 * @example
 * ```typescript
 * const node: AltNode = {
 *   type: "alt",
 *   children: [
 *     { type: "lit", value: "cat" },
 *     { type: "lit", value: "dog" }
 *   ]
 * };
 * // Matches "cat" OR "dog"
 * ```
 */
export interface AltNode extends AstNode {
  readonly type: "alt";
  /** Alternative patterns (one must match) */
  readonly children: readonly AstNode[];
}

/**
 * Character class node - matches any character in the set
 *
 * @example
 * ```typescript
 * const node: CharClassNode = { type: "cls", chars: "a-z0-9", negated: false };
 * // Matches [a-z0-9]
 *
 * const negated: CharClassNode = { type: "cls", chars: "a-z", negated: true };
 * // Matches [^a-z] (anything except lowercase letters)
 * ```
 */
export interface CharClassNode extends AstNode {
  readonly type: "cls";
  /** Character set specification (e.g., "a-z0-9") */
  readonly chars: string;
  /** If true, matches characters NOT in the set */
  readonly negated?: boolean;
}

/**
 * Capture group node - captures matched text for extraction or backreferences
 *
 * @example
 * ```typescript
 * const named: GroupNode = {
 *   type: "group",
 *   name: "username",
 *   child: { type: "raw", pattern: "\\w+" }
 * };
 * // Creates (?<username>\w+)
 *
 * const numbered: GroupNode = {
 *   type: "group",
 *   child: { type: "raw", pattern: "\\d+" }
 * };
 * // Creates (\d+) - numbered group
 * ```
 */
export interface GroupNode extends AstNode {
  readonly type: "group";
  /** Optional name for named capture groups */
  readonly name?: string;
  /** Pattern to capture */
  readonly child: AstNode;
}

/**
 * Non-capturing group node - groups without capturing (optimized)
 *
 * @example
 * ```typescript
 * const node: NonCapNode = {
 *   type: "noncap",
 *   child: { type: "alt", children: [...] }
 * };
 * // Creates (?:...) - groups without memory overhead
 * ```
 */
export interface NonCapNode extends AstNode {
  readonly type: "noncap";
  /** Pattern to group without capturing */
  readonly child: AstNode;
}

/**
 * Try-capture node - conditional capture with validation metadata
 *
 * Enables pattern validation and linting based on expected capture structure.
 * Unlike regular groups, try-captures include validation metadata for better error reporting.
 *
 * @example
 * ```typescript
 * const node: TryCaptureNode = {
 *   type: "trycapture",
 *   name: "email",
 *   child: { type: "raw", pattern: "[\\w.-]+@[\\w.-]+" },
 *   validation: {
 *     description: "Valid email address",
 *     pattern: "\\w+@\\w+\\.\\w+"
 *   }
 * };
 * ```
 */
export interface TryCaptureNode extends AstNode {
  readonly type: "trycapture";
  /** Optional name for the capture */
  readonly name?: string;
  /** Pattern to capture */
  readonly child: AstNode;
  /** Optional validation metadata */
  readonly validation?: {
    /** Human-readable description of what should be captured */
    readonly description: string;
    /** Optional regex pattern to validate against */
    readonly pattern?: string;
  };
}

/**
 * Backreference node - references a previous capture group
 *
 * @example
 * ```typescript
 * const byName: BackrefNode = { type: "backref", target: "word" };
 * // Creates \k<word> - references named group
 *
 * const byNumber: BackrefNode = { type: "backref", target: 1 };
 * // Creates \1 - references first numbered group
 * ```
 */
export interface BackrefNode extends AstNode {
  readonly type: "backref";
  /** Name or number of the group to reference */
  readonly target: string | number;
}

/**
 * Assertion node - zero-width look-around assertions
 *
 * Assertions match positions without consuming characters.
 * They're essential for context-sensitive pattern matching.
 *
 * @example
 * ```typescript
 * const lookahead: AssertionNode = {
 *   type: "assertion",
 *   kind: "lookahead",
 *   child: { type: "lit", value: "@" }
 * };
 * // Creates (?=@) - matches position before @ without consuming it
 *
 * const lookbehind: AssertionNode = {
 *   type: "assertion",
 *   kind: "lookbehind",
 *   child: { type: "raw", pattern: "\\d{3}" }
 * };
 * // Creates (?<=\\d{3}) - matches position after 3 digits
 * ```
 */
export interface AssertionNode extends AstNode {
  readonly type: "assertion";
  /** Type of assertion */
  readonly kind:
    | "lookahead"
    | "negative-lookahead"
    | "lookbehind"
    | "negative-lookbehind";
  /** Pattern to assert (not consumed) */
  readonly child: AstNode;
}

/**
 * Quantifier node - specifies repetition of a pattern
 *
 * @example
 * ```typescript
 * const oneOrMore: QuantifierNode = {
 *   type: "q",
 *   child: { type: "raw", pattern: "\\d" },
 *   min: 1,
 *   max: null  // No maximum
 * };
 * // Creates \d+ - matches one or more digits
 *
 * const range: QuantifierNode = {
 *   type: "q",
 *   child: { type: "raw", pattern: "\\w" },
 *   min: 2,
 *   max: 5,
 *   lazy: true
 * };
 * // Creates \w{2,5}? - matches 2-5 word chars (lazy)
 * ```
 */
export interface QuantifierNode extends AstNode {
  readonly type: "q";
  /** Pattern to repeat */
  readonly child: AstNode;
  /** Minimum number of repetitions */
  readonly min: number;
  /** Maximum number of repetitions (null = unbounded) */
  readonly max: number | null;
  /** If true, matches as few as possible (lazy/non-greedy) */
  readonly lazy?: boolean;
}

/**
 * Anchor node - matches a position in the string
 *
 * @example
 * ```typescript
 * const start: AnchorNode = { type: "anchor", position: "start" };
 * // Creates ^ - matches start of line/string
 *
 * const end: AnchorNode = { type: "anchor", position: "end" };
 * // Creates $ - matches end of line/string
 *
 * const wordBoundary: AnchorNode = { type: "anchor", position: "word" };
 * // Creates \b - matches word boundary
 * ```
 */
export interface AnchorNode extends AstNode {
  readonly type: "anchor";
  /** Position to anchor: start (^), end ($), or word boundary (\b) */
  readonly position: "start" | "end" | "word";
}

// Union type of all AST nodes
export type Ast =
  | LitNode
  | RawNode
  | SeqNode
  | AltNode
  | CharClassNode
  | GroupNode
  | NonCapNode
  | TryCaptureNode
  | BackrefNode
  | AssertionNode
  | QuantifierNode
  | AnchorNode;

/**
 * Creates a literal string node with automatic escaping
 *
 * All special regex characters are automatically escaped, making this safe
 * for matching literal text strings.
 *
 * @param value - The literal string to match
 * @returns A LitNode with escaped value
 * @example
 * ```typescript
 * lit("hello.world")  // Matches literal "hello.world" (dot is escaped)
 * lit("$100")         // Matches literal "$100" ($ is escaped)
 * ```
 */
export const lit = (value: string): LitNode => ({
  type: "lit",
  value: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), // Escape regex specials
});

/**
 * Creates a raw regex pattern node (no escaping)
 *
 * Use this when you need to include raw regex syntax directly.
 * No escaping is performed - the pattern is used as-is.
 *
 * @param pattern - Raw regex pattern string
 * @returns A RawNode with the pattern
 * @example
 * ```typescript
 * raw("\\d{3}-\\d{4}")  // Matches phone number format
 * raw("[a-zA-Z]+")      // Matches one or more letters
 * ```
 */
export const raw = (pattern: string): RawNode => ({
  type: "raw",
  pattern,
});

/**
 * Creates a sequence node (concatenation)
 *
 * Matches patterns in order. This is the fundamental composition operator
 * for building complex patterns from simpler ones.
 *
 * @param children - Child patterns to match in sequence
 * @returns A SeqNode containing all children
 * @example
 * ```typescript
 * seq(lit("hello"), lit(" "), lit("world"))
 * // Matches "hello world"
 *
 * seq(raw("\\d+"), lit("."), raw("\\d+"))
 * // Matches decimal numbers like "3.14"
 * ```
 */
export const seq = (...children: AstNode[]): SeqNode => ({
  type: "seq",
  children,
});

/**
 * Creates an alternation node (OR)
 *
 * Matches any one of the provided alternatives. Children are automatically
 * sorted for deterministic output.
 *
 * @param children - Alternative patterns (one must match)
 * @returns An AltNode with sorted alternatives
 * @example
 * ```typescript
 * alt(lit("cat"), lit("dog"), lit("bird"))
 * // Matches "cat" OR "dog" OR "bird"
 *
 * alt(raw("\\d{3}"), raw("\\d{4}"))
 * // Matches 3 or 4 digit numbers
 * ```
 */
export const alt = (...children: AstNode[]): AltNode => ({
  type: "alt",
  children: [...children].sort(compareNodes), // Deterministic ordering
});

/**
 * Creates a character class node
 *
 * Matches any single character from the specified set.
 *
 * @param chars - Character set specification (e.g., "a-z0-9")
 * @param negated - If true, matches characters NOT in the set
 * @returns A CharClassNode
 * @example
 * ```typescript
 * cls("a-z0-9")           // Matches [a-z0-9]
 * cls("aeiou", true)       // Matches [^aeiou] (not a vowel)
 * cls("0-9A-Fa-f")        // Matches hex digits
 * ```
 */
export const cls = (chars: string, negated = false): CharClassNode => ({
  type: "cls",
  chars,
  negated,
});

export const group = (child: AstNode, name?: string): GroupNode => ({
  type: "group",
  name,
  child,
});

export const noncap = (child: AstNode): NonCapNode => ({
  type: "noncap",
  child,
});

export const tryCapture = (
  child: AstNode,
  name?: string,
  validation?: { description: string; pattern?: string }
): TryCaptureNode => ({
  type: "trycapture",
  name,
  child,
  validation,
});

export const backref = (target: string | number): BackrefNode => ({
  type: "backref",
  target,
});

export const lookahead = (child: AstNode): AssertionNode => ({
  type: "assertion",
  kind: "lookahead",
  child,
});

export const negativeLookahead = (child: AstNode): AssertionNode => ({
  type: "assertion",
  kind: "negative-lookahead",
  child,
});

export const lookbehind = (child: AstNode): AssertionNode => ({
  type: "assertion",
  kind: "lookbehind",
  child,
});

export const negativeLookbehind = (child: AstNode): AssertionNode => ({
  type: "assertion",
  kind: "negative-lookbehind",
  child,
});

export const q = (
  child: AstNode,
  min: number,
  max: number | null = null,
  lazy = false
): QuantifierNode => ({
  type: "q",
  child,
  min,
  max,
  lazy,
});

export const anchor = (position: "start" | "end" | "word"): AnchorNode => ({
  type: "anchor",
  position,
});

/**
 * Basic emit function for AST nodes (will be enhanced with dialect support)
 */
const emitNode = (node: AstNode, dialect: "js" | "re2" | "pcre"): string => {
  switch (node.type) {
    case "lit":
      return node.value;
    case "raw":
      return node.pattern;
    case "seq":
      return node.children.map((child) => emitNode(child, dialect)).join("");
    case "alt":
      return node.children.map((child) => emitNode(child, dialect)).join("|");
    case "cls":
      return node.negated ? `[^${node.chars}]` : `[${node.chars}]`;
    case "group":
      return node.name
        ? `(?<${node.name}>${emitNode(node.child, dialect)})`
        : `(${emitNode(node.child, dialect)})`;
    case "noncap":
      return `(?:${emitNode(node.child, dialect)})`;
    case "trycapture":
      // TryCapture emits as a regular capture group
      // Validation metadata is used by the tester, not the regex itself
      return node.name
        ? `(?<${node.name}>${emitNode(node.child, dialect)})`
        : `(${emitNode(node.child, dialect)})`;
    case "q": {
      const quantifier =
        node.max === null
          ? node.min === 0
            ? "*"
            : node.min === 1
              ? "+"
              : `{${node.min},}`
          : node.max === node.min
            ? `{${node.min}}`
            : `{${node.min},${node.max}}`;
      return `${emitNode(node.child, dialect)}${quantifier}${node.lazy ? "?" : ""}`;
    }
    case "anchor":
      switch (node.position) {
        case "start":
          return "^";
        case "end":
          return "$";
        case "word":
          return "\\b";
      }
      break;
    case "backref":
      if (typeof node.target === "string") {
        return `\\k<${node.target}>`;
      }
      return `\\${node.target}`;
    case "assertion": {
      const childPattern = emitNode(node.child, dialect);
      switch (node.kind) {
        case "lookahead":
          return `(?=${childPattern})`;
        case "negative-lookahead":
          return `(?!${childPattern})`;
        case "lookbehind":
          return `(?<=${childPattern})`;
        case "negative-lookbehind":
          return `(?<!${childPattern})`;
      }
    }
  }
};

/**
 * Compare nodes for deterministic alternation sorting
 * Simple string comparison of their emitted patterns
 */
const compareNodes = (a: AstNode, b: AstNode): number => {
  const aStr = emitNode(a, "js");
  const bStr = emitNode(b, "js");
  return aStr.localeCompare(bStr);
};
