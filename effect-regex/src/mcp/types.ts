/**
 * Shared types and constants for MCP server
 *
 * This module provides common type definitions and configuration constants
 * used across all MCP tools.
 *
 * @module mcp/types
 */

import type { McpError } from "@modelcontextprotocol/sdk/types.js";
import type { Effect } from "effect";

/**
 * Supported regex dialects for pattern emission and conversion
 */
export type RegexDialect = "js" | "re2" | "pcre";

/**
 * Supported regex dialects for pattern testing
 */
export type TestDialect = "js" | "re2-sim" | "re2";

/**
 * Explanation format options
 */
export type ExplanationFormat = "tree" | "steps" | "summary";

/**
 * Standard input validation and safety limits
 */
export const LIMITS = {
  /** Maximum length for regex pattern strings */
  MAX_PATTERN_LENGTH: 20_000,
  /** Maximum number of capture groups allowed */
  MAX_GROUPS: 200,
  /** Maximum depth of alternation nesting */
  MAX_ALTERNATION_DEPTH: 10,
  /** Maximum number of test cases per test run */
  MAX_TEST_CASES: 50,
  /** Default timeout per test case in milliseconds */
  DEFAULT_TIMEOUT_MS: 100,
  /** Maximum number of refinement iterations for AI pattern proposal */
  MAX_REFINEMENT_ITERATIONS: 5,
  /** Maximum length for context descriptions */
  MAX_CONTEXT_LENGTH: 500,
  /** Maximum number of positive examples for AI pattern proposal */
  MAX_POSITIVE_EXAMPLES: 20,
  /** Maximum number of negative examples for AI pattern proposal */
  MAX_NEGATIVE_EXAMPLES: 20,
  /** Maximum search query length for library filtering */
  MAX_SEARCH_LENGTH: 100,
} as const;

/**
 * Base tool handler function type
 *
 * All tool handlers follow this signature for consistency
 */
export type ToolHandler<TArgs = any, TResult = any> = (
  args: TArgs
) => Effect.Effect<never, McpError, TResult>;

/**
 * Build regex tool arguments
 */
export interface BuildRegexArgs {
  readonly input:
    | { readonly type: "ast"; readonly ast: any }
    | { readonly type: "std"; readonly name: string }
    | { readonly type: "command"; readonly spec: any };
  readonly dialect?: RegexDialect;
  readonly anchor?: boolean;
}

/**
 * Test regex tool arguments
 */
export interface TestRegexArgs {
  readonly pattern: string;
  readonly dialect?: TestDialect;
  readonly cases: readonly {
    readonly input: string;
    readonly shouldMatch?: boolean;
    readonly expectedCaptures?: Record<string, string | string[]>;
  }[];
  readonly timeoutMs?: number;
}

/**
 * Lint regex tool arguments
 */
export interface LintRegexArgs {
  readonly pattern: string;
  readonly dialect?: RegexDialect;
}

/**
 * Convert regex tool arguments
 */
export interface ConvertRegexArgs {
  readonly pattern: string;
  readonly fromDialect?: RegexDialect;
  readonly toDialect: RegexDialect;
  readonly allowDowngrades?: boolean;
}

/**
 * Explain regex tool arguments
 */
export interface ExplainRegexArgs {
  readonly pattern: string;
  readonly format?: ExplanationFormat;
  readonly dialect?: RegexDialect;
}

/**
 * Library list tool arguments
 */
export interface LibraryListArgs {
  readonly filter?: {
    readonly tag?: string;
    readonly dialect?: RegexDialect;
    readonly search?: string;
  };
}

/**
 * Propose pattern tool arguments
 */
export interface ProposePatternArgs {
  readonly positiveExamples: readonly string[];
  readonly negativeExamples?: readonly string[];
  readonly context?: string;
  readonly maxIterations?: number;
  readonly dialect?: TestDialect;
}

/**
 * Optimize pattern tool arguments
 */
export interface OptimizePatternArgs {
  readonly input:
    | { readonly type: "std"; readonly name: string }
    | { readonly type: "pattern"; readonly pattern: string };
  readonly options?: {
    readonly constantFolding?: boolean;
    readonly quantifierSimplification?: boolean;
    readonly characterClassMerging?: boolean;
    readonly alternationDedup?: boolean;
    readonly maxPasses?: number;
  };
  readonly dialect?: RegexDialect;
}
