/**
 * MCP Tool Schema Definitions
 *
 * This module provides JSON Schema definitions for all MCP tools.
 * Schemas are used for:
 * - Request validation by the MCP SDK
 * - IDE autocomplete and type checking
 * - API documentation generation
 *
 * @module mcp/schemas
 */

import { STANDARD_PATTERNS } from "../std/patterns.js";
import { LIMITS } from "./types.js";

/**
 * MCP Tool definition with name, description, and input schema
 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: any;
}

/**
 * Build regex tool schema
 *
 * Supports building patterns from:
 * - Standard library patterns
 * - Command specifications (CLI parsing)
 * - AST (fluent builder - future)
 */
export const BUILD_REGEX_SCHEMA: ToolDefinition = {
  name: "build_regex",
  description:
    "Build a regex pattern from AST, standard library, or CommandSpec",
  inputSchema: {
    type: "object",
    properties: {
      input: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: { const: "ast" },
              ast: {
                type: "object",
                description: "Fluent builder AST",
              },
            },
            required: ["type", "ast"],
          },
          {
            type: "object",
            properties: {
              type: { const: "std" },
              name: {
                enum: Object.keys(STANDARD_PATTERNS),
                description: "Standard library pattern name",
              },
            },
            required: ["type", "name"],
          },
          {
            type: "object",
            properties: {
              type: { const: "command" },
              spec: {
                type: "object",
                description: "CommandSpec for CLI parsing",
                properties: {
                  name: { type: "string" },
                  subcommands: { type: "array", items: { type: "string" } },
                  flags: { type: "array", items: { type: "object" } },
                  options: { type: "array", items: { type: "object" } },
                  positionals: { type: "array", items: { type: "object" } },
                  allowInterleaving: { type: "boolean" },
                },
                required: ["name"],
              },
            },
            required: ["type", "spec"],
          },
        ],
      },
      dialect: {
        enum: ["js", "re2", "pcre"],
        default: "js",
        description: "Target regex dialect",
      },
      anchor: {
        type: "boolean",
        default: false,
        description: "Add start/end anchors (^$)",
      },
    },
    required: ["input"],
  },
};

/**
 * Test regex tool schema
 *
 * Validates patterns against test cases with timeout protection
 */
export const TEST_REGEX_SCHEMA: ToolDefinition = {
  name: "test_regex",
  description: "Test a regex pattern against test cases with timeouts",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regex pattern to test" },
      dialect: {
        enum: ["js", "re2-sim", "re2"],
        default: "js",
        description: "Regex execution dialect",
      },
      cases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            input: { type: "string" },
            shouldMatch: { type: "boolean", default: true },
            expectedCaptures: {
              type: "object",
              description: "Expected capture groups",
            },
          },
          required: ["input"],
        },
        minItems: 1,
        maxItems: LIMITS.MAX_TEST_CASES,
        description: "Test cases to run",
      },
      timeoutMs: {
        type: "integer",
        minimum: 10,
        maximum: 5000,
        default: LIMITS.DEFAULT_TIMEOUT_MS,
        description: "Timeout per test case in milliseconds",
      },
    },
    required: ["pattern", "cases"],
  },
};

/**
 * Lint regex tool schema
 *
 * Checks patterns for safety, performance, and dialect compatibility
 */
export const LINT_REGEX_SCHEMA: ToolDefinition = {
  name: "lint_regex",
  description:
    "Lint a regex pattern for safety, performance, and dialect compatibility",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Pattern string or AST to lint",
      },
      dialect: {
        enum: ["js", "re2", "pcre"],
        default: "js",
        description: "Target dialect for linting",
      },
    },
    required: ["pattern"],
  },
};

/**
 * Convert regex tool schema
 *
 * Converts patterns between dialects with best-effort compatibility
 */
export const CONVERT_REGEX_SCHEMA: ToolDefinition = {
  name: "convert_regex",
  description:
    "Convert a regex pattern between dialects with best-effort compatibility",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Source pattern" },
      fromDialect: {
        enum: ["js", "re2", "pcre"],
        default: "js",
        description: "Source dialect",
      },
      toDialect: {
        enum: ["js", "re2", "pcre"],
        description: "Target dialect",
      },
      allowDowngrades: {
        type: "boolean",
        default: true,
        description: "Allow lossy conversions with notes",
      },
    },
    required: ["pattern", "toDialect"],
  },
};

/**
 * Explain regex tool schema
 *
 * Generates human-readable explanations of pattern structure
 */
export const EXPLAIN_REGEX_SCHEMA: ToolDefinition = {
  name: "explain_regex",
  description:
    "Generate a human-readable explanation of a regex pattern structure",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regex pattern to explain" },
      format: {
        enum: ["tree", "steps", "summary"],
        default: "tree",
        description: "Explanation format",
      },
      dialect: {
        enum: ["js", "re2", "pcre"],
        default: "js",
        description: "Dialect context",
      },
    },
    required: ["pattern"],
  },
};

/**
 * Library list tool schema
 *
 * Lists patterns in the standard library with optional filtering
 */
export const LIBRARY_LIST_SCHEMA: ToolDefinition = {
  name: "library_list",
  description: "List all patterns in the local library",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Filter by tag" },
          dialect: {
            enum: ["js", "re2", "pcre"],
            description: "Filter by dialect",
          },
          search: {
            type: "string",
            maxLength: LIMITS.MAX_SEARCH_LENGTH,
            description: "Search in names/descriptions",
          },
        },
      },
    },
  },
};

/**
 * Propose pattern tool schema
 *
 * AI-assisted pattern generation from examples with iterative refinement
 */
export const PROPOSE_PATTERN_SCHEMA: ToolDefinition = {
  name: "propose_pattern",
  description:
    "AI-assisted pattern proposal from examples using propose → test → refine loop",
  inputSchema: {
    type: "object",
    properties: {
      positiveExamples: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: LIMITS.MAX_POSITIVE_EXAMPLES,
        description: "Examples that should match the pattern",
      },
      negativeExamples: {
        type: "array",
        items: { type: "string" },
        maxItems: LIMITS.MAX_NEGATIVE_EXAMPLES,
        default: [],
        description: "Examples that should NOT match the pattern",
      },
      context: {
        type: "string",
        maxLength: LIMITS.MAX_CONTEXT_LENGTH,
        description: "Additional context about the pattern purpose",
      },
      maxIterations: {
        type: "integer",
        minimum: 1,
        maximum: LIMITS.MAX_REFINEMENT_ITERATIONS,
        default: 3,
        description: "Maximum refinement iterations",
      },
      dialect: {
        enum: ["js", "re2-sim", "re2"],
        default: "js",
        description: "Target dialect for testing",
      },
    },
    required: ["positiveExamples"],
  },
};

/**
 * Optimize pattern tool schema
 *
 * Applies AST transformation passes to optimize patterns
 */
export const OPTIMIZE_PATTERN_SCHEMA: ToolDefinition = {
  name: "optimize_pattern",
  description: "Optimize a regex pattern by applying AST transformation passes",
  inputSchema: {
    type: "object",
    properties: {
      input: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: { const: "std" },
              name: {
                enum: Object.keys(STANDARD_PATTERNS),
                description: "Standard library pattern name",
              },
            },
            required: ["type", "name"],
          },
          {
            type: "object",
            properties: {
              type: { const: "pattern" },
              pattern: {
                type: "string",
                description:
                  "Regex pattern string (limited optimization without AST)",
              },
            },
            required: ["type", "pattern"],
          },
        ],
      },
      options: {
        type: "object",
        properties: {
          constantFolding: { type: "boolean", default: true },
          quantifierSimplification: { type: "boolean", default: true },
          characterClassMerging: { type: "boolean", default: true },
          alternationDedup: { type: "boolean", default: true },
          maxPasses: { type: "integer", minimum: 1, maximum: 10, default: 5 },
        },
      },
      dialect: {
        enum: ["js", "re2", "pcre"],
        default: "js",
        description: "Target dialect for emission",
      },
    },
    required: ["input"],
  },
};

/**
 * All tool schemas in a single array for server registration
 */
export const ALL_TOOLS: readonly ToolDefinition[] = [
  BUILD_REGEX_SCHEMA,
  TEST_REGEX_SCHEMA,
  LINT_REGEX_SCHEMA,
  CONVERT_REGEX_SCHEMA,
  EXPLAIN_REGEX_SCHEMA,
  LIBRARY_LIST_SCHEMA,
  PROPOSE_PATTERN_SCHEMA,
  OPTIMIZE_PATTERN_SCHEMA,
] as const;
