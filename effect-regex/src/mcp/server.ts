#!/usr/bin/env node

/**
 * Effect Regex MCP Server - Model Context Protocol server for regex tools
 *
 * This server provides 8 tools for regex pattern development:
 * - build_regex: Build patterns from AST, standard library, or CommandSpec
 * - test_regex: Test patterns against test cases with timeout protection
 * - lint_regex: Validate patterns for safety and compatibility
 * - convert_regex: Convert patterns between dialects (js, re2, pcre)
 * - explain_regex: Generate human-readable explanations (stub)
 * - library_list: List patterns in the standard library
 * - propose_pattern: AI-assisted pattern generation from examples
 * - optimize_pattern: Apply AST optimization passes
 *
 * Architecture:
 * - Modular tool handlers in ./tools/
 * - Shared schemas in ./schemas.ts
 * - Validation utilities in ./utils/validation.ts
 * - Type definitions in ./types.ts
 *
 * @module mcp/server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { ALL_TOOLS } from "./schemas.js";
import {
  handleBuildRegex,
  handleConvertRegex,
  handleExplainRegex,
  handleLibraryList,
  handleLintRegex,
  handleOptimizePattern,
  handleProposePattern,
  handleTestRegex,
} from "./tools/index.js";

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: "effect-regex",
    version: "0.5.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 *
 * Returns all 8 tool definitions with their schemas
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

/**
 * Handle tool calls with routing to appropriate handlers
 *
 * Routes tool calls to modular handlers and wraps errors in MCP format.
 * All handlers return Effect types which are run with Effect.runPromise.
 *
 * @param request - Tool call request with name and arguments
 * @returns Tool result as JSON text content
 * @throws McpError for invalid tools or execution failures
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    // Route to appropriate handler
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

    // Return result as JSON text
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

/**
 * Start the MCP server on stdio transport
 *
 * Connects to the stdio transport and logs startup message to stderr.
 * Any startup errors are logged and cause process exit with code 1.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Effect Regex MCP server running on stdio");
}

// Start server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
