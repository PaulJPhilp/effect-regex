/**
 * Core AST types for the regex builder
 */

// Base AST node type
export interface AstNode {
  readonly type: string;
}

// Primitive nodes
export interface LitNode extends AstNode {
  readonly type: "lit";
  readonly value: string;
}

export interface RawNode extends AstNode {
  readonly type: "raw";
  readonly pattern: string;
}

// Sequence and alternation
export interface SeqNode extends AstNode {
  readonly type: "seq";
  readonly children: readonly AstNode[];
}

export interface AltNode extends AstNode {
  readonly type: "alt";
  readonly children: readonly AstNode[];
}

// Character classes
export interface CharClassNode extends AstNode {
  readonly type: "cls";
  readonly chars: string;
  readonly negated?: boolean;
}

// Groups and references
export interface GroupNode extends AstNode {
  readonly type: "group";
  readonly name?: string;
  readonly child: AstNode;
}

export interface NonCapNode extends AstNode {
  readonly type: "noncap";
  readonly child: AstNode;
}

export interface TryCaptureNode extends AstNode {
  readonly type: "trycapture";
  readonly name?: string;
  readonly child: AstNode;
  readonly validation?: {
    readonly description: string;
    readonly pattern?: string; // Optional regex pattern to validate against
  };
}

export interface BackrefNode extends AstNode {
  readonly type: "backref";
  readonly target: string | number;
}

// Assertions (lookahead/lookbehind)
export interface AssertionNode extends AstNode {
  readonly type: "assertion";
  readonly kind:
    | "lookahead"
    | "negative-lookahead"
    | "lookbehind"
    | "negative-lookbehind";
  readonly child: AstNode;
}

// Quantifiers
export interface QuantifierNode extends AstNode {
  readonly type: "q";
  readonly child: AstNode;
  readonly min: number;
  readonly max: number | null;
  readonly lazy?: boolean;
}

// Anchors
export interface AnchorNode extends AstNode {
  readonly type: "anchor";
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

// Constructor functions
export const lit = (value: string): LitNode => ({
  type: "lit",
  value: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), // Escape regex specials
});

export const raw = (pattern: string): RawNode => ({
  type: "raw",
  pattern,
});

export const seq = (...children: AstNode[]): SeqNode => ({
  type: "seq",
  children,
});

export const alt = (...children: AstNode[]): AltNode => ({
  type: "alt",
  children: [...children].sort(compareNodes), // Deterministic ordering
});

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
