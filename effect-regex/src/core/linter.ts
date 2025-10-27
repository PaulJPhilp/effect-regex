/**
 * Pattern Linter - validates AST patterns and detects potential issues
 *
 * This module provides comprehensive linting for regex patterns, checking for:
 * - Dialect compatibility issues (RE2, PCRE, JavaScript)
 * - Potential catastrophic backtracking
 * - Undefined backreferences
 * - Empty alternatives
 * - High pattern complexity
 *
 * @module core/linter
 */

import type { Ast } from "./ast.js";
import type { Dialect } from "./emitter.js";

/**
 * Lint issue severity levels
 *
 * - **error**: Pattern will not work correctly (e.g., undefined backreference)
 * - **warning**: Pattern may have issues but will still work (e.g., performance)
 */
export type LintSeverity = "error" | "warning";

/**
 * A linting issue detected in a pattern
 *
 * Each issue includes a code for categorization, severity level, and
 * descriptive message. Optional position information may be included.
 */
export interface LintIssue {
  /** Unique code identifying the issue type (e.g., "RE2_BACKREFS", "CAT_BACKTRACK") */
  readonly code: string;
  /** Severity level of the issue */
  readonly severity: LintSeverity;
  /** Human-readable description of the issue */
  readonly message: string;
  /** Optional position information in the source pattern */
  readonly position?: {
    readonly start: number;
    readonly end: number;
  };
}

/**
 * Result of linting a pattern
 *
 * Contains validation status and a list of all detected issues.
 * A pattern is considered valid if it has no errors (warnings are acceptable).
 */
export interface LintResult {
  /** Whether the pattern is valid (no errors, warnings OK) */
  readonly valid: boolean;
  /** All detected issues, ordered by severity then position */
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
      if (
        node.type === "assertion" &&
        (node.kind === "lookbehind" || node.kind === "negative-lookbehind")
      ) {
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
        const target =
          typeof node.target === "string"
            ? `"${node.target}"`
            : `#${node.target}`;
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
 * Collect all capture groups from an AST
 *
 * Traverses the AST and builds a map of all capture groups (both named and numbered).
 * Used to validate backreferences point to existing groups.
 *
 * @param ast - The AST to collect groups from
 * @returns Map of group names/numbers to their indices
 * @internal
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
      if (node.type === "backref" && !groups.has(node.target)) {
        const target =
          typeof node.target === "string"
            ? `"${node.target}"`
            : `#${node.target}`;
        return {
          code: "UNDEFINED_BACKREF",
          severity: "error",
          message: `Backreference to undefined group ${target}.`,
        };
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
        // Leaf nodes (lit, raw, cls, anchor, backref) don't have children
        default:
          break;
      }
      return null;
    };

    return checkBackrefs(ast);
  },
];

/**
 * Lint a regex AST for potential issues
 *
 * Performs comprehensive validation of a regex pattern AST, checking for:
 * - Dialect-specific compatibility issues
 * - Potential performance problems (catastrophic backtracking, high complexity)
 * - Logical errors (undefined backreferences, empty alternatives)
 *
 * @param ast - The AST to lint
 * @param dialect - Target regex dialect for compatibility checking
 * @returns Lint result with validity status and list of issues
 * @example
 * ```typescript
 * const ast = backref("nonexistent");
 * const result = lint(ast, "js");
 * // result.valid === false
 * // result.issues[0].code === "UNDEFINED_BACKREF"
 * ```
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
 * Estimate pattern complexity score
 *
 * Calculates a heuristic complexity score for a pattern node.
 * Higher scores indicate patterns that may have performance issues.
 * Quantifiers and alternations contribute exponentially to complexity.
 *
 * @param node - The AST node to estimate complexity for
 * @returns Complexity score (threshold for warnings is typically 1000)
 * @internal
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
 * Format lint results for human-readable display
 *
 * Converts a LintResult into a formatted string with emoji indicators
 * for severity levels. Useful for CLI output or logging.
 *
 * @param result - The lint result to format
 * @returns Formatted multi-line string with all issues listed
 * @example
 * ```typescript
 * const result = lint(ast, "re2");
 * console.log(formatLintResult(result));
 * // Lint Results:
 * // ❌ RE2_BACKREFS: Backreferences are not supported in RE2.
 * // ⚠️ CAT_BACKTRACK: Potential catastrophic backtracking detected.
 * ```
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
