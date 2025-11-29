/**
 * Build Regex Tool - Build patterns from AST, standard library, or CommandSpec
 *
 * @module mcp/tools/build-regex
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { buildCommandRegex } from "../../command/command-spec.js";
import { emit } from "../../core/builder.js";
import { STANDARD_PATTERNS } from "../../std/patterns.js";
import type { BuildRegexArgs, ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle build_regex tool requests
 *
 * Builds regex patterns from:
 * - Standard library patterns (by name)
 * - Command specifications (CLI parsing)
 * - AST (fluent builder - not yet implemented)
 *
 * @param args - Input source, dialect, and anchor options
 * @returns Emitted regex pattern string
 */
export const handleBuildRegex: ToolHandler<BuildRegexArgs, any> = (args) => {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const { input, dialect = "js", anchor = false } = args;

    let result: string;

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

    return result;
  }).pipe(
    Effect.catchAll((error) => Effect.fail(toMcpError(error, "Build failed")))
  );
};
