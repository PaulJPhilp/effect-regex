#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { developPattern } from "../ai/toolkit.js";
import { buildCommandRegex } from "../command/command-spec.js";
import { emit, RegexBuilder } from "../core/builder.js";
import { optimize } from "../core/optimizer.js";
import { type RegexTestCase, testRegex } from "../core/tester.js";
import { STANDARD_PATTERNS } from "../std/patterns.js";

// MCP Tool definitions with schemas
const TOOLS = [
  {
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
  },
  {
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
          maxItems: 50,
          description: "Test cases to run",
        },
        timeoutMs: {
          type: "integer",
          minimum: 10,
          maximum: 5000,
          default: 100,
          description: "Timeout per test case in milliseconds",
        },
      },
      required: ["pattern", "cases"],
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
              maxLength: 100,
              description: "Search in names/descriptions",
            },
          },
        },
      },
    },
  },
  {
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
          maxItems: 20,
          description: "Examples that should match the pattern",
        },
        negativeExamples: {
          type: "array",
          items: { type: "string" },
          maxItems: 20,
          default: [],
          description: "Examples that should NOT match the pattern",
        },
        context: {
          type: "string",
          maxLength: 500,
          description: "Additional context about the pattern purpose",
        },
        maxIterations: {
          type: "integer",
          minimum: 1,
          maximum: 5,
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
  },
  {
    name: "optimize_pattern",
    description:
      "Optimize a regex pattern by applying AST transformation passes",
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
  },
];

// Input validation and limits
const MAX_PATTERN_LENGTH = 20_000;
const MAX_GROUPS = 200;
const MAX_ALTERNATION_DEPTH = 10;
const MAX_TEST_CASES = 50;
const DEFAULT_TIMEOUT_MS = 100;

function validateInputEffect(input: any): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    if (typeof input === "string" && input.length > MAX_PATTERN_LENGTH) {
      return Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Pattern too long: ${input.length} > ${MAX_PATTERN_LENGTH}`
        )
      );
    }

    if (
      input?.cases &&
      Array.isArray(input.cases) &&
      input.cases.length > MAX_TEST_CASES
    ) {
      return Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Too many test cases: ${input.cases.length} > ${MAX_TEST_CASES}`
        )
      );
    }
    return Effect.unit; // Represents a successful void return
  });
}

// Tool handlers
function handleBuildRegex(
  args: any
): Effect.Effect<never, McpError, { content: any[] }> {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const { input, dialect = "js", anchor = false } = args;

    let result;

    if (input.type === "std") {
      const stdPattern =
        STANDARD_PATTERNS[input.name as keyof typeof STANDARD_PATTERNS];
      if (!stdPattern) {
        return yield* Effect.fail(
          new McpError(
            ErrorCode.InvalidParams,
            `Unknown standard pattern: ${input.name}`
          )
        );
      }
      result = emit(stdPattern.pattern, dialect as any, anchor);
    } else if (input.type === "command") {
      result = buildCommandRegex(input.spec, dialect as any);
    } else {
      // AST input not implemented yet
      return yield* Effect.fail(
        new McpError(ErrorCode.InvalidParams, "AST input not yet supported")
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof McpError) {
        return Effect.fail(error);
      }
      return Effect.fail(
        new McpError(
          ErrorCode.InternalError,
          `Build failed: ${(error as Error).message}`
        )
      );
    })
  );
}

function handleTestRegex(
  args: any
): Effect.Effect<never, McpError, { content: any[] }> {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const {
      pattern,
      cases,
      dialect = "js",
      timeoutMs = DEFAULT_TIMEOUT_MS,
    } = args;

    const testCases: RegexTestCase[] = cases.map((c: any) => ({
      input: c.input,
      shouldMatch: c.shouldMatch ?? true,
      expectedCaptures: c.expectedCaptures,
    }));

    const result = yield* testRegex(
      pattern,
      dialect as any,
      testCases,
      timeoutMs
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof McpError) {
        return Effect.fail(error);
      }
      return Effect.fail(
        new McpError(
          ErrorCode.InternalError,
          `Test failed: ${(error as Error).message}`
        )
      );
    })
  );
}

const handleLintRegex = (args: unknown) =>
  Effect.gen(function* () {
    const { pattern, flags } = yield* validateInputEffect(
      args,
      LintRegexRequestSchema
    );

    const result = yield* Linter.lint({ pattern, flags });

    // This is the part that needs to return a plain object, not an Effect
    return { valid: result.valid, issues: result.issues };
  });

function handleConvertRegex(
  args: any
): Effect.Effect<never, McpError, { content: any[] }> {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const {
      pattern,
      fromDialect = "js",
      toDialect,
      allowDowngrades = true,
    } = args;

    // Basic conversion - just return the pattern with notes
    // TODO: Implement actual dialect conversion
    const result = {
      pattern,
      fromDialect,
      toDialect,
      success: true,
      notes: [
        "Basic conversion - dialect-specific conversion coming soon",
        `Converted from ${fromDialect} to ${toDialect}`,
      ],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof McpError) {
        return Effect.fail(error);
      }
      return Effect.fail(
        new McpError(
          ErrorCode.InternalError,
          `Conversion failed: ${(error as Error).message}`
        )
      );
    })
  );
}

const handleExplainRegex = (args: unknown) =>
  Effect.gen(function* () {
    const { pattern, dialect } = yield* validateInputEffect(
      args,
      ExplainRegexRequestSchema
    );

    const explanation = yield* Explainer.explain({ pattern, dialect });

    return { pattern, explanation };
  });

function handleLibraryList(
  args: any
): Effect.Effect<never, McpError, { content: any[] }> {
  return Effect.gen(function* () {
    // No validateInputEffect since the error is handled differently

    let patterns = Object.entries(STANDARD_PATTERNS).map(([name, pattern]) => ({
      name,
      description: pattern.description,
      examples: pattern.examples,
      dialect: pattern.dialect,
    }));

    // Apply filters if provided
    if (args?.filter) {
      const { dialect, search } = args.filter;

      if (dialect) {
        patterns = patterns.filter(
          (p) => p.dialect === dialect || p.dialect === "universal"
        );
      }

      if (search) {
        const searchLower = search.toLowerCase();
        patterns = patterns.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower)
        );
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total: patterns.length,
              patterns,
              filters: args?.filter || null,
            },
            null,
            2
          ),
        },
      ],
    };
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof McpError) {
        return Effect.fail(error);
      }
      return Effect.fail(
        new McpError(
          ErrorCode.InternalError,
          `Library list failed: ${(error as Error).message}`
        )
      );
    })
  );
}

function handleProposePattern(
  args: any
): Effect.Effect<never, McpError, { content: any[] }> {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const {
      positiveExamples,
      negativeExamples = [],
      context,
      maxIterations = 3,
      dialect = "js",
    } = args;

    // Run the AI development pattern loop
    const result = yield* developPattern(
      positiveExamples,
      negativeExamples,
      maxIterations,
      dialect as any
    );

    // Convert the final pattern to string
    const emittedPattern = emit(result.finalPattern, dialect as any, false);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: result.success,
              pattern: emittedPattern.pattern,
              iterations: result.iterations,
              testResults: result.testResults,
              captureMap: emittedPattern.captureMap,
              notes: emittedPattern.notes,
              history: result.history.map((proposal, idx) => ({
                iteration: idx + 1,
                reasoning: proposal.reasoning,
                confidence: proposal.confidence,
                pattern: emit(proposal.pattern, dialect as any, false).pattern,
              })),
              context: context || null,
            },
            null,
            2
          ),
        },
      ],
    };
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof McpError) {
        return Effect.fail(error);
      }
      return Effect.fail(
        new McpError(
          ErrorCode.InternalError,
          `Pattern proposal failed: ${(error as Error).message}`
        )
      );
    })
  );
}

function handleOptimizePattern(
  args: any
): Effect.Effect<never, McpError, { content: any[] }> {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const { input, options = {}, dialect = "js" } = args;

    let ast;
    let patternName;

    if (input.type === "std") {
      const stdPattern =
        STANDARD_PATTERNS[input.name as keyof typeof STANDARD_PATTERNS];
      if (!stdPattern) {
        return yield* Effect.fail(
          new McpError(
            ErrorCode.InvalidParams,
            `Unknown standard pattern: ${input.name}`
          )
        );
      }
      ast = stdPattern.pattern.getAst();
      patternName = input.name;
    } else {
      // For pattern strings, we can't optimize without parsing
      return yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          "Pattern string optimization not yet supported. Use standard library patterns or provide AST directly."
        )
      );
    }

    // Emit before optimization
    const beforeBuilder = new RegexBuilder(ast);
    const beforeResult = emit(beforeBuilder, dialect as any, false);

    // Run optimization (synchronous call - no longer wrapped in Effect)
    const result = optimize(ast, options);

    // Emit after optimization
    const optimizedBuilder = new RegexBuilder(result.optimized);
    const afterResult = emit(optimizedBuilder, dialect as any, false);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              pattern: patternName || "custom",
              before: {
                pattern: beforeResult.pattern,
                nodes: result.beforeSize,
                captureMap: beforeResult.captureMap,
              },
              after: {
                pattern: afterResult.pattern,
                nodes: result.afterSize,
                captureMap: afterResult.captureMap,
              },
              optimization: {
                nodesReduced: result.nodesReduced,
                reductionPercent:
                  result.beforeSize > 0
                    ? Math.round(
                        (result.nodesReduced / result.beforeSize) * 100
                      )
                    : 0,
                passesApplied: result.passesApplied,
                iterations: result.passesApplied.length,
              },
              dialect,
            },
            null,
            2
          ),
        },
      ],
    };
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof McpError) {
        return Effect.fail(error);
      }
      return Effect.fail(
        new McpError(
          ErrorCode.InternalError,
          `Optimization failed: ${(error as Error).message}`
        )
      );
    })
  );
}

// Create and start MCP server
const server = new Server(
  {
    name: "effect-regex",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;
    switch (name) {
      case "build_regex":
        result = await Effect.runPromise(handleBuildRegex(args));
        break;
      case "test_regex":
        result = await Effect.runPromise(handleTestRegex(args));
        break;
      case "lint_regex":
        result = await Effect.runPromise(handleLintRegex(args));
        break;
      case "convert_regex":
        result = await Effect.runPromise(handleConvertRegex(args));
        break;
      case "explain_regex":
        result = await Effect.runPromise(handleExplainRegex(args));
        break;
      case "library_list":
        result = await Effect.runPromise(handleLibraryList(args));
        break;
      case "propose_pattern":
        result = await Effect.runPromise(handleProposePattern(args));
        break;
      case "optimize_pattern":
        result = await Effect.runPromise(handleOptimizePattern(args));
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Re-throw McpError as-is, wrap other errors
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${(error as Error).message}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Effect Regex MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
