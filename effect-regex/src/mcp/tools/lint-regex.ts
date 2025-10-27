/**
 * Lint Regex Tool - Validate regex patterns for safety and compatibility
 *
 * @module mcp/tools/lint-regex
 */

import { Effect } from "effect";
import type { LintRegexArgs, ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle lint_regex tool requests
 *
 * Validates regex patterns by:
 * - Checking if pattern compiles successfully
 * - Reporting syntax errors with details
 *
 * Note: Full AST-based linting (catastrophic backtracking, dialect compatibility)
 * requires regex string parsing which is planned for post-1.0.
 *
 * @param args - Pattern and dialect
 * @returns Lint result with valid flag and issues array
 */
export const handleLintRegex: ToolHandler<LintRegexArgs, any> = (args) => {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const { pattern: patternStr, dialect = "js" } = args;

    // Try to compile the regex - if it throws, catch it and return invalid result
    const validationResult = yield* Effect.try(
      () => new RegExp(patternStr)
    ).pipe(
      Effect.map(() => ({
        valid: true,
        issues: [],
      })),
      Effect.catchAll((error) => {
        // If regex compilation failed, return success with validation error
        return Effect.succeed({
          valid: false,
          issues: [
            {
              type: "syntax",
              severity: "error",
              message: (error as Error).message,
              pattern: patternStr,
            },
          ],
        });
      })
    );

    return validationResult;
  }).pipe(
    Effect.catchAll((error) => Effect.fail(toMcpError(error, "Lint failed")))
  );
};
