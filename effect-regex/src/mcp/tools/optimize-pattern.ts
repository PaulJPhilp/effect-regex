/**
 * Optimize Pattern Tool - Apply AST transformation passes to optimize patterns
 *
 * @module mcp/tools/optimize-pattern
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { emit, RegexBuilder } from "../../core/builder.js";
import { optimize } from "../../core/optimizer.js";
import { STANDARD_PATTERNS } from "../../std/patterns.js";
import type { OptimizePatternArgs, ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle optimize_pattern tool requests
 *
 * Applies AST transformation passes to optimize patterns:
 * - Constant folding (combines adjacent literals)
 * - Quantifier simplification (e.g., {1,1} → exact match)
 * - Character class merging (e.g., [a-z][0-9] → [a-z0-9])
 * - Alternation deduplication (removes duplicate branches)
 *
 * Note: Optimization requires AST. Currently only works with standard library patterns.
 * String pattern optimization requires regex parsing (planned for post-1.0).
 *
 * @param args - Pattern source, optimization options, and dialect
 * @returns Before/after patterns with optimization statistics
 */
export const handleOptimizePattern: ToolHandler<OptimizePatternArgs, any> = (
  args
) => {
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
    const beforeBuilder = RegexBuilder.fromAst(ast);
    const beforeResult = emit(beforeBuilder, dialect as any, false);

    // Run optimization (synchronous call - no longer wrapped in Effect)
    const result = optimize(ast, options);

    // Emit after optimization
    const optimizedBuilder = RegexBuilder.fromAst(result.optimized);
    const afterResult = emit(optimizedBuilder, dialect as any, false);

    return {
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
            ? Math.round((result.nodesReduced / result.beforeSize) * 100)
            : 0,
        passesApplied: result.passesApplied,
        iterations: result.passesApplied.length,
      },
      dialect,
    };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(toMcpError(error, "Optimization failed"))
    )
  );
};
