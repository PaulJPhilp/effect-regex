/**
 * Explain Regex Tool - Generate human-readable regex explanations
 *
 * Note: Currently a stub. Full implementation requires regex string parsing
 * which is deferred to post-1.0 release.
 *
 * @module mcp/tools/explain-regex
 */

import { Effect } from "effect";
import type { ExplainRegexArgs, ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle explain_regex tool requests
 *
 * Currently returns a stub explanation with notes about pending implementation.
 * Full implementation will:
 * - Parse regex string to AST
 * - Generate tree/steps/summary format explanations
 * - Provide dialect-specific insights
 *
 * @param args - Pattern and format options
 * @returns Explanation structure (currently stub)
 */
export const handleExplainRegex: ToolHandler<ExplainRegexArgs, any> = (
  args
) => {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const { pattern: patternStr, dialect = "js", format = "tree" } = args;

    // Note: Full regex string → AST parsing is deferred to post-1.0 release
    // For now, this tool returns a basic explanation stub
    // Planned enhancement: Implement regex parser to convert string patterns to AST,
    // then use the explainer.ts module for full structural analysis
    // Current workaround: Use standard library patterns via CLI or build patterns with RegexBuilder
    return {
      pattern: patternStr,
      explanation: {
        type: "pattern",
        description:
          "Pattern explanation requires regex string parsing (planned for post-1.0)",
        pattern: patternStr,
        dialect,
        notes: [
          "Full regex string parsing is not yet implemented",
          "For detailed explanations, use standard library patterns via CLI: node dist/bin.cjs explain <pattern-name>",
          "Or build patterns using RegexBuilder API for full AST-based analysis",
        ],
      },
    };
  }).pipe(
    Effect.catchAll((error) => Effect.fail(toMcpError(error, "Explain failed")))
  );
};
