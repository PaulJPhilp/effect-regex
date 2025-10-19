import type { Ast } from "./ast.js";

/**
 * Explanation node for structured regex breakdown
 */
export interface ExplanationNode {
  readonly type: "literal" | "characterClass" | "group" | "quantifier" | "anchor" | "sequence" | "alternation";
  readonly description: string;
  readonly pattern: string;
  readonly children?: readonly ExplanationNode[];
  readonly notes?: readonly string[];
}

/**
 * Explanation format options
 */
export interface ExplainOptions {
  readonly format: "tree" | "steps" | "summary";
  readonly dialect: "js" | "re2" | "pcre";
  readonly maxDepth?: number;
}

/**
 * Generate a structured explanation of a regex AST
 */
export const explain = (ast: Ast, options: ExplainOptions): ExplanationNode => {
  const { format, dialect, maxDepth = 10 } = options;

  const explainNode = (node: Ast, depth = 0): ExplanationNode => {
    if (depth > maxDepth) {
      return {
        type: "literal",
        description: "[Deep nesting - truncated for readability]",
        pattern: "...",
      };
    }

    switch (node.type) {
      case "lit":
        return {
          type: "literal",
          description: `Matches the literal text "${node.value.replace(/\\/g, '\\\\')}"`,
          pattern: node.value,
        };

      case "raw":
        return {
          type: "literal",
          description: `Matches the raw pattern "${node.pattern}"`,
          pattern: node.pattern,
        };

      case "cls":
        const chars = node.negated ? `[^${node.chars}]` : `[${node.chars}]`;
        const charDesc = node.negated ? "not in" : "in";
        return {
          type: "characterClass",
          description: `Matches any character ${charDesc} the set: ${node.chars}`,
          pattern: chars,
          notes: node.negated ? ["Negated character class"] : undefined,
        };

      case "group":
        const groupDesc = node.name
          ? `Capturing group named "${node.name}"`
          : "Capturing group";
        const child = explainNode(node.child, depth + 1);
        return {
          type: "group",
          description: groupDesc,
          pattern: node.name ? `(?<${node.name}>${child.pattern})` : `(${child.pattern})`,
          children: [child],
          notes: node.name ? [`Captured as: ${node.name}`] : undefined,
        };

      case "noncap":
        const noncapChild = explainNode(node.child, depth + 1);
        return {
          type: "group",
          description: "Non-capturing group",
          pattern: `(?:${noncapChild.pattern})`,
          children: [noncapChild],
          notes: ["Does not create a capture group"],
        };

      case "q":
        const quantifierDesc = getQuantifierDescription(node);
        const quantifierPattern = getQuantifierPattern(node);
        const qChild = explainNode(node.child, depth + 1);
        return {
          type: "quantifier",
          description: quantifierDesc,
          pattern: `${qChild.pattern}${quantifierPattern}`,
          children: [qChild],
          notes: node.lazy ? ["Lazy matching (prefers shorter matches)"] : undefined,
        };

      case "anchor":
        const anchorDesc = getAnchorDescription(node);
        const anchorPattern = getAnchorPattern(node);
        return {
          type: "anchor",
          description: anchorDesc,
          pattern: anchorPattern,
        };

      case "seq":
        const seqChildren = node.children.map(child => explainNode(child, depth + 1));
        const seqPattern = seqChildren.map(c => c.pattern).join("");
        return {
          type: "sequence",
          description: `Sequence of ${node.children.length} elements`,
          pattern: seqPattern,
          children: seqChildren,
        };

      case "alt":
        const altChildren = node.children.map(child => explainNode(child, depth + 1));
        const altPattern = altChildren.map(c => c.pattern).join("|");
        return {
          type: "alternation",
          description: `Alternation: matches any of ${node.children.length} options`,
          pattern: altPattern,
          children: altChildren,
          notes: ["Tries options from left to right"],
        };
    }
  };

  return explainNode(ast);
};

/**
 * Format explanation as human-readable text
 */
export const formatExplanation = (node: ExplanationNode, indent = ""): string => {
  const lines: string[] = [];

  lines.push(`${indent}${node.description}`);
  lines.push(`${indent}Pattern: ${node.pattern}`);

  if (node.notes && node.notes.length > 0) {
    lines.push(`${indent}Notes: ${node.notes.join(", ")}`);
  }

  if (node.children && node.children.length > 0) {
    lines.push(`${indent}Components:`);
    for (const child of node.children) {
      lines.push(formatExplanation(child, indent + "  "));
    }
  }

  return lines.join("\n");
};

const getQuantifierDescription = (node: Ast & { type: "q" }): string => {
  const { min, max } = node;

  if (max === null) {
    if (min === 0) return "Zero or more (kleene star)";
    if (min === 1) return "One or more (kleene plus)";
    return `At least ${min}`;
  }

  if (max === min) return `Exactly ${min}`;
  return `Between ${min} and ${max}`;
};

const getQuantifierPattern = (node: Ast & { type: "q" }): string => {
  const { min, max, lazy } = node;
  let pattern: string;

  if (max === null) {
    if (min === 0) pattern = "*";
    else if (min === 1) pattern = "+";
    else pattern = `{${min},}`;
  } else if (max === min) {
    pattern = `{${min}}`;
  } else {
    pattern = `{${min},${max}}`;
  }

  return lazy ? `${pattern}?` : pattern;
};

const getAnchorDescription = (node: Ast & { type: "anchor" }): string => {
  switch (node.position) {
    case "start": return "Start of string anchor";
    case "end": return "End of string anchor";
    case "word": return "Word boundary anchor";
  }
};

const getAnchorPattern = (node: Ast & { type: "anchor" }): string => {
  switch (node.position) {
    case "start": return "^";
    case "end": return "$";
    case "word": return "\\b";
  }
};
