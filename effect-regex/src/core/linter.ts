import type { Ast } from "./ast.js";
import type { Dialect } from "./emitter.js";

/**
 * Lint issue severity levels
 */
export type LintSeverity = "error" | "warning";

/**
 * A linting issue
 */
export interface LintIssue {
  readonly code: string;
  readonly severity: LintSeverity;
  readonly message: string;
  readonly position?: {
    readonly start: number;
    readonly end: number;
  };
}

/**
 * Lint result
 */
export interface LintResult {
  readonly valid: boolean;
  readonly issues: readonly LintIssue[];
}

/**
 * Dialect-specific linting rules
 */
const DIALECT_RULES: Record<
  Dialect,
  ReadonlyArray<(ast: Ast) => LintIssue | null>
> = {
  js: [
    // JS-specific rules can go here
  ],

  re2: [
    // RE2 doesn't support named groups
    (node): LintIssue | null => {
      if ((node.type === "group" || node.type === "trycapture") && node.name) {
        return {
          code: "RE2_NAMED_GROUPS",
          severity: "error",
          message: `Named groups are not supported in RE2. Group "${node.name}" will be converted to a numbered group.`,
        };
      }
      return null;
    },

    // RE2 doesn't support lookbehind
    (node): LintIssue | null => {
      if (node.type === "raw") {
        const lookbehindRegex = /(\(\?<[=!])/;
        if (lookbehindRegex.test(node.pattern)) {
          return {
            code: "RE2_LOOKBEHIND",
            severity: "error",
            message: "Lookbehind assertions are not supported in RE2.",
          };
        }
      }
      if (node.type === "assertion" && (node.kind === "lookbehind" || node.kind === "negative-lookbehind")) {
        return {
          code: "RE2_LOOKBEHIND",
          severity: "error",
          message: `${node.kind} assertions are not supported in RE2.`,
        };
      }
      return null;
    },

    // RE2 doesn't support backreferences
    (node): LintIssue | null => {
      if (node.type === "raw") {
        const backrefRegex = /\\([1-9]\d*)/;
        if (backrefRegex.test(node.pattern)) {
          return {
            code: "RE2_BACKREFS",
            severity: "error",
            message: "Backreferences are not supported in RE2.",
          };
        }
      }
      if (node.type === "backref") {
        const target = typeof node.target === "string" ? `"${node.target}"` : `#${node.target}`;
        return {
          code: "RE2_BACKREFS",
          severity: "error",
          message: `Backreferences are not supported in RE2 (reference to ${target}).`,
        };
      }
      return null;
    },
  ],

  pcre: [
    // PCRE-specific rules can go here
  ],
};

/**
 * Helper to collect all groups in the AST
 */
const collectGroups = (ast: Ast): Map<string | number, number> => {
  const groups = new Map<string | number, number>();
  let groupCounter = 0;

  const traverse = (node: Ast): void => {
    switch (node.type) {
      case "group":
        groupCounter++;
        if (node.name) {
          groups.set(node.name, groupCounter);
        }
        groups.set(groupCounter, groupCounter);
        traverse(node.child);
        break;
      case "trycapture":
        groupCounter++;
        if (node.name) {
          groups.set(node.name, groupCounter);
        }
        groups.set(groupCounter, groupCounter);
        traverse(node.child);
        break;
      case "seq":
      case "alt":
        node.children.forEach(traverse);
        break;
      case "noncap":
      case "q":
      case "assertion":
        traverse(node.child);
        break;
      default:
        break;
    }
  };

  traverse(ast);
  return groups;
};

/**
 * General linting rules applicable to all dialects
 */
const GENERAL_RULES: ReadonlyArray<(ast: Ast) => LintIssue | null> = [
  // Check for potential catastrophic backtracking
  (node): LintIssue | null => {
    if (node.type === "raw") {
      // Simple heuristics for nested quantifiers
      const nestedQuantifiers = /(\([^)]*\*[^*]*\))\s*\*/;
      if (nestedQuantifiers.test(node.pattern)) {
        return {
          code: "CAT_BACKTRACK",
          severity: "warning",
          message:
            "Potential catastrophic backtracking detected. Consider using atomic groups or possessive quantifiers.",
        };
      }
    }
    return null;
  },

  // Check for empty alternatives
  (node): LintIssue | null => {
    if (node.type === "alt") {
      const emptyAlts = node.children.filter(
        (child) => child.type === "lit" && child.value === ""
      );
      if (emptyAlts.length > 0) {
        return {
          code: "EMPTY_ALT",
          severity: "warning",
          message: "Empty alternatives can make patterns ambiguous.",
        };
      }
    }
    return null;
  },

  // Check for overly complex patterns
  (node): LintIssue | null => {
    const complexity = estimateComplexity(node);
    if (complexity > 1000) {
      return {
        code: "HIGH_COMPLEXITY",
        severity: "warning",
        message: `Pattern complexity (${complexity}) may impact performance. Consider simplifying or using a different approach.`,
      };
    }
    return null;
  },

  // Check for undefined backreferences (must be done at AST root level)
  (ast): LintIssue | null => {
    const groups = collectGroups(ast);
    const checkBackrefs = (node: Ast): LintIssue | null => {
      if (node.type === "backref") {
        if (!groups.has(node.target)) {
          const target = typeof node.target === "string" ? `"${node.target}"` : `#${node.target}`;
          return {
            code: "UNDEFINED_BACKREF",
            severity: "error",
            message: `Backreference to undefined group ${target}.`,
          };
        }
      }

      // Recursively check children
      switch (node.type) {
        case "seq":
        case "alt":
          for (const child of node.children) {
            const issue = checkBackrefs(child);
            if (issue) return issue;
          }
          break;
        case "group":
        case "noncap":
        case "trycapture":
        case "q":
        case "assertion":
          return checkBackrefs(node.child);
      }
      return null;
    };

    return checkBackrefs(ast);
  },
];

/**
 * Lint a regex AST for issues
 */
export const lint = (ast: Ast, dialect: Dialect): LintResult => {
  const issues: LintIssue[] = [];

  // Recursively lint all nodes in the tree
  const lintNode = (node: Ast, path: string[] = []): void => {
    const currentPath = [...path, node.type];

    // Run dialect-specific rules on this node
    const dialectRules = DIALECT_RULES[dialect];
    for (const rule of dialectRules) {
      const issue = rule(node);
      if (issue) {
        issues.push(issue);
      }
    }

    // Recursively check children
    switch (node.type) {
      case "seq":
      case "alt":
        node.children.forEach((child, index) =>
          lintNode(child, [...currentPath, index.toString()])
        );
        break;
      case "group":
      case "noncap":
      case "trycapture":
      case "q":
      case "assertion":
        lintNode(node.child, currentPath);
        break;
      default:
        // Leaf nodes (lit, raw, cls, anchor, backref) don't have children
        break;
    }
  };

  // Run general rules on the root AST (these may traverse the tree themselves)
  for (const rule of GENERAL_RULES) {
    const issue = rule(ast);
    if (issue) {
      issues.push(issue);
    }
  }

  // Lint all nodes in the tree with dialect-specific rules
  lintNode(ast);

  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    valid: !hasErrors,
    issues,
  };
};

/**
 * Estimate pattern complexity for performance warnings
 */
const estimateComplexity = (node: Ast): number => {
  switch (node.type) {
    case "lit":
      return node.value.length;
    case "raw":
      return node.pattern.length;
    case "cls":
      return 10; // Character classes are moderately complex
    case "seq":
      return node.children.reduce(
        (sum, child) => sum + estimateComplexity(child),
        0
      );
    case "alt":
      return node.children.reduce(
        (sum, child) => sum + estimateComplexity(child),
        node.children.length * 5
      );
    case "group":
    case "noncap":
    case "trycapture":
      return estimateComplexity(node.child) + 2;
    case "q": {
      // Quantifiers add exponential complexity
      const childComplexity = estimateComplexity(node.child);
      return node.max === null
        ? childComplexity * 10
        : childComplexity * (node.max - node.min + 1);
    }
    case "anchor":
      return 1;
    case "backref":
      // Backreferences add moderate complexity
      return 15;
    case "assertion":
      // Assertions add complexity based on their child pattern
      return estimateComplexity(node.child) + 10;
    default:
      return 1;
  }
};

/**
 * Format lint results for display
 */
export const formatLintResult = (result: LintResult): string => {
  if (result.issues.length === 0) {
    return "✅ No lint issues found.";
  }

  const lines = ["Lint Results:"];

  for (const issue of result.issues) {
    const severity = issue.severity === "error" ? "❌" : "⚠️";
    lines.push(`${severity} ${issue.code}: ${issue.message}`);
  }

  return lines.join("\n");
};
