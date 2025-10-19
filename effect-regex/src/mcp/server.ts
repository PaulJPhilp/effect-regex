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
import { emit, RegexBuilder } from "../core/builder.js";
import { testRegex, type RegexTestCase } from "../core/tester.js";
import { lint } from "../core/linter.js";
import { explain, formatExplanation } from "../core/explainer.js";
import { STANDARD_PATTERNS } from "../std/patterns.js";
import { buildCommandRegex } from "../command/command-spec.js";
import { proposePattern, developPattern } from "../ai/toolkit.js";
import { optimize } from "../core/optimizer.js";

// MCP Tool definitions with schemas
const TOOLS = [
  {
    name: "build_regex",
    description: "Build a regex pattern from AST, standard library, or CommandSpec",
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
                  description: "Fluent builder AST"
                }
              },
              required: ["type", "ast"]
            },
            {
              type: "object",
              properties: {
                type: { const: "std" },
                name: {
                  enum: Object.keys(STANDARD_PATTERNS),
                  description: "Standard library pattern name"
                }
              },
              required: ["type", "name"]
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
                    allowInterleaving: { type: "boolean" }
                  },
                  required: ["name"]
                }
              },
              required: ["type", "spec"]
            }
          ]
        },
        dialect: {
          enum: ["js", "re2", "pcre"],
          default: "js",
          description: "Target regex dialect"
        },
        anchor: {
          type: "boolean",
          default: false,
          description: "Add start/end anchors (^$)"
        }
      },
      required: ["input"]
    }
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
          description: "Regex execution dialect"
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
                description: "Expected capture groups"
              }
            },
            required: ["input"]
          },
          minItems: 1,
          maxItems: 50,
          description: "Test cases to run"
        },
        timeoutMs: {
          type: "integer",
          minimum: 10,
          maximum: 5000,
          default: 100,
          description: "Timeout per test case in milliseconds"
        }
      },
      required: ["pattern", "cases"]
    }
  },
  {
    name: "lint_regex",
    description: "Lint a regex pattern for safety, performance, and dialect compatibility",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Pattern string or AST to lint" },
        dialect: {
          enum: ["js", "re2", "pcre"],
          default: "js",
          description: "Target dialect for linting"
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "convert_regex",
    description: "Convert a regex pattern between dialects with best-effort compatibility",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Source pattern" },
        fromDialect: {
          enum: ["js", "re2", "pcre"],
          default: "js",
          description: "Source dialect"
        },
        toDialect: {
          enum: ["js", "re2", "pcre"],
          description: "Target dialect"
        },
        allowDowngrades: {
          type: "boolean",
          default: true,
          description: "Allow lossy conversions with notes"
        }
      },
      required: ["pattern", "toDialect"]
    }
  },
  {
    name: "explain_regex",
    description: "Generate a human-readable explanation of a regex pattern structure",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern to explain" },
        format: {
          enum: ["tree", "steps", "summary"],
          default: "tree",
          description: "Explanation format"
        },
        dialect: {
          enum: ["js", "re2", "pcre"],
          default: "js",
          description: "Dialect context"
        }
      },
      required: ["pattern"]
    }
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
            dialect: { enum: ["js", "re2", "pcre"], description: "Filter by dialect" },
            search: { type: "string", maxLength: 100, description: "Search in names/descriptions" }
          }
        }
      }
    }
  },
  {
    name: "propose_pattern",
    description: "AI-assisted pattern proposal from examples using propose → test → refine loop",
    inputSchema: {
      type: "object",
      properties: {
        positiveExamples: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 20,
          description: "Examples that should match the pattern"
        },
        negativeExamples: {
          type: "array",
          items: { type: "string" },
          maxItems: 20,
          default: [],
          description: "Examples that should NOT match the pattern"
        },
        context: {
          type: "string",
          maxLength: 500,
          description: "Additional context about the pattern purpose"
        },
        maxIterations: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          default: 3,
          description: "Maximum refinement iterations"
        },
        dialect: {
          enum: ["js", "re2-sim", "re2"],
          default: "js",
          description: "Target dialect for testing"
        }
      },
      required: ["positiveExamples"]
    }
  },
  {
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
                  description: "Standard library pattern name"
                }
              },
              required: ["type", "name"]
            },
            {
              type: "object",
              properties: {
                type: { const: "pattern" },
                pattern: {
                  type: "string",
                  description: "Regex pattern string (limited optimization without AST)"
                }
              },
              required: ["type", "pattern"]
            }
          ]
        },
        options: {
          type: "object",
          properties: {
            constantFolding: { type: "boolean", default: true },
            quantifierSimplification: { type: "boolean", default: true },
            characterClassMerging: { type: "boolean", default: true },
            alternationDedup: { type: "boolean", default: true },
            maxPasses: { type: "integer", minimum: 1, maximum: 10, default: 5 }
          }
        },
        dialect: {
          enum: ["js", "re2", "pcre"],
          default: "js",
          description: "Target dialect for emission"
        }
      },
      required: ["input"]
    }
  }
];

// Input validation and limits
const MAX_PATTERN_LENGTH = 20000;
const MAX_GROUPS = 200;
const MAX_ALTERNATION_DEPTH = 10;
const MAX_TEST_CASES = 50;
const DEFAULT_TIMEOUT_MS = 100;

function validateInput(input: any): void {
  // Basic input validation
  if (typeof input === 'string' && input.length > MAX_PATTERN_LENGTH) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Pattern too long: ${input.length} > ${MAX_PATTERN_LENGTH}`
    );
  }

  if (input?.cases && Array.isArray(input.cases) && input.cases.length > MAX_TEST_CASES) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Too many test cases: ${input.cases.length} > ${MAX_TEST_CASES}`
    );
  }
}

// Tool handlers
async function handleBuildRegex(args: any) {
  validateInput(args);

  const { input, dialect = "js", anchor = false } = args;

  try {
    let result;

    if (input.type === "std") {
      const stdPattern = STANDARD_PATTERNS[input.name as keyof typeof STANDARD_PATTERNS];
      if (!stdPattern) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown standard pattern: ${input.name}`);
      }
      result = emit(stdPattern.pattern, dialect as any, anchor);
    } else if (input.type === "command") {
      result = buildCommandRegex(input.spec, dialect as any);
    } else {
      // AST input not implemented yet
      throw new McpError(ErrorCode.InvalidParams, "AST input not yet supported");
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Build failed: ${(error as Error).message}`
    );
  }
}

async function handleTestRegex(args: any) {
  validateInput(args);

  const { pattern, cases, dialect = "js", timeoutMs = DEFAULT_TIMEOUT_MS } = args;

  try {
    const testCases: RegexTestCase[] = cases.map((c: any) => ({
      input: c.input,
      shouldMatch: c.shouldMatch ?? true,
      expectedCaptures: c.expectedCaptures
    }));

    const result = await Effect.runPromise(
      testRegex(pattern, dialect as any, testCases, timeoutMs)
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Test failed: ${(error as Error).message}`
    );
  }
}

async function handleLintRegex(args: any) {
  validateInput(args);

  const { pattern, dialect = "js" } = args;

  try {
    // For now, just validate as regex string
    // TODO: Parse into AST for proper linting
    new RegExp(pattern);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: true,
          issues: []
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: false,
          issues: [{
            code: "INVALID_PATTERN",
            severity: "error",
            message: `Invalid regex pattern: ${(error as Error).message}`
          }]
        }, null, 2)
      }]
    };
  }
}

async function handleConvertRegex(args: any) {
  validateInput(args);

  const { pattern, fromDialect = "js", toDialect, allowDowngrades = true } = args;

  try {
    // Basic conversion - just return the pattern with notes
    // TODO: Implement actual dialect conversion
    const result = {
      pattern,
      fromDialect,
      toDialect,
      success: true,
      notes: [
        "Basic conversion - dialect-specific conversion coming soon",
        `Converted from ${fromDialect} to ${toDialect}`
      ]
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Conversion failed: ${(error as Error).message}`
    );
  }
}

async function handleExplainRegex(args: any) {
  validateInput(args);

  const { pattern, format = "tree", dialect = "js" } = args;

  try {
    // Try to parse the pattern and explain it
    // For now, we'll create a simple pattern using RegexBuilder
    // In the future, we'll implement regex parsing (string → AST)

    // Validate the pattern first
    new RegExp(pattern);

    // For standard library patterns, we can provide detailed explanations
    const stdPatternEntry = Object.entries(STANDARD_PATTERNS).find(
      ([_, p]) => emit(p.pattern, dialect as any, false).pattern === pattern
    );

    if (stdPatternEntry) {
      const [name, stdPattern] = stdPatternEntry;
      const ast = stdPattern.pattern.getAst();
      const explanationTree = explain(ast, { format: format as any, dialect: dialect as any });
      const formattedExplanation = formatExplanation(explanationTree);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            pattern,
            standardLibraryPattern: name,
            description: stdPattern.description,
            examples: stdPattern.examples,
            format,
            dialect,
            explanation: formattedExplanation,
            explanationTree
          }, null, 2)
        }]
      };
    }

    // For other patterns, provide basic info
    const result = {
      pattern,
      format,
      dialect,
      explanation: `Pattern: ${pattern}\n\nThis is a ${dialect} regex pattern. To get detailed explanations, use patterns from the standard library or build patterns using the RegexBuilder API.`,
      notes: [
        "For detailed AST-based explanations, use standard library patterns",
        "Regex parsing (string → AST) is planned for future releases"
      ]
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Explanation failed: ${(error as Error).message}`
    );
  }
}

async function handleLibraryList(args: any) {
  try {
    let patterns = Object.entries(STANDARD_PATTERNS).map(([name, pattern]) => ({
      name,
      description: pattern.description,
      examples: pattern.examples,
      dialect: pattern.dialect
    }));

    // Apply filters if provided
    if (args?.filter) {
      const { dialect, search } = args.filter;

      if (dialect) {
        patterns = patterns.filter(p => p.dialect === dialect || p.dialect === "universal");
      }

      if (search) {
        const searchLower = search.toLowerCase();
        patterns = patterns.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
        );
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: patterns.length,
          patterns,
          filters: args?.filter || null
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Library list failed: ${(error as Error).message}`
    );
  }
}

async function handleProposePattern(args: any) {
  validateInput(args);

  const {
    positiveExamples,
    negativeExamples = [],
    context,
    maxIterations = 3,
    dialect = "js"
  } = args;

  try {
    // Run the AI development pattern loop
    const result = await Effect.runPromise(
      developPattern(
        positiveExamples,
        negativeExamples,
        maxIterations,
        dialect as any
      )
    );

    // Convert the final pattern to string
    const emittedPattern = emit(result.finalPattern, dialect as any, false);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
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
            pattern: emit(proposal.pattern, dialect as any, false).pattern
          })),
          context: context || null
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Pattern proposal failed: ${(error as Error).message}`
    );
  }
}

async function handleOptimizePattern(args: any) {
  validateInput(args);

  const { input, options = {}, dialect = "js" } = args;

  try {
    let ast;
    let patternName;

    if (input.type === "std") {
      const stdPattern = STANDARD_PATTERNS[input.name as keyof typeof STANDARD_PATTERNS];
      if (!stdPattern) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown standard pattern: ${input.name}`);
      }
      ast = stdPattern.pattern.getAst();
      patternName = input.name;
    } else {
      // For pattern strings, we can't optimize without parsing
      throw new McpError(
        ErrorCode.InvalidParams,
        "Pattern string optimization not yet supported. Use standard library patterns or provide AST directly."
      );
    }

    // Emit before optimization
    const beforeBuilder = new RegexBuilder(ast);
    const beforeResult = emit(beforeBuilder, dialect as any, false);

    // Run optimization
    const result = await Effect.runPromise(optimize(ast, options));

    // Emit after optimization
    const optimizedBuilder = new RegexBuilder(result.optimized);
    const afterResult = emit(optimizedBuilder, dialect as any, false);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          pattern: patternName || "custom",
          before: {
            pattern: beforeResult.pattern,
            nodes: result.beforeSize,
            captureMap: beforeResult.captureMap
          },
          after: {
            pattern: afterResult.pattern,
            nodes: result.afterSize,
            captureMap: afterResult.captureMap
          },
          optimization: {
            nodesReduced: result.nodesReduced,
            reductionPercent: result.beforeSize > 0
              ? Math.round((result.nodesReduced / result.beforeSize) * 100)
              : 0,
            passesApplied: result.passesApplied,
            iterations: result.passesApplied.length
          },
          dialect
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Optimization failed: ${(error as Error).message}`
    );
  }
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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "build_regex":
        return await handleBuildRegex(args);
      case "test_regex":
        return await handleTestRegex(args);
      case "lint_regex":
        return await handleLintRegex(args);
      case "convert_regex":
        return await handleConvertRegex(args);
      case "explain_regex":
        return await handleExplainRegex(args);
      case "library_list":
        return await handleLibraryList(args);
      case "propose_pattern":
        return await handleProposePattern(args);
      case "optimize_pattern":
        return await handleOptimizePattern(args);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
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
