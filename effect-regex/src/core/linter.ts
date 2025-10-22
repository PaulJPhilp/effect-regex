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
      if (node.type === "group" && node.name) {
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
      return null;
    },
  ],

  pcre: [
    // PCRE-specific rules can go here
  ],
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
];

/**
 * Lint a regex AST for issues
 */
export const lint = (ast: Ast, dialect: Dialect): LintResult => {
  const issues: LintIssue[] = [];

  // Run dialect-specific rules
  const dialectRules = DIALECT_RULES[dialect];
  for (const rule of dialectRules) {
    const issue = rule(ast);
    if (issue) {
      issues.push(issue);
    }
  }

  // Run general rules
  for (const rule of GENERAL_RULES) {
    const issue = rule(ast);
    if (issue) {
      issues.push(issue);
    }
  }

  // Recursively lint child nodes
  const lintChildren = (node: Ast, path: string[] = []): void => {
    const currentPath = [...path, node.type];

    switch (node.type) {
      case "seq":
      case "alt":
        node.children.forEach((child, index) =>
          lintChildren(child, [...currentPath, index.toString()])
        );
        break;
      case "group":
      case "noncap":
        lintChildren(node.child, currentPath);
        break;
      case "q":
        lintChildren(node.child, currentPath);
        break;
      default:
        // Leaf nodes don't need recursion
        break;
    }
  };

  lintChildren(ast);

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
