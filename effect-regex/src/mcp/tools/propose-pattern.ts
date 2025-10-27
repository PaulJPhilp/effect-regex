/**
 * Propose Pattern Tool - AI-assisted pattern generation from examples
 *
 * @module mcp/tools/propose-pattern
 */

import { Effect } from "effect";
import { developPattern } from "../../ai/toolkit.js";
import { emit } from "../../core/builder.js";
import type { ProposePatternArgs, ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle propose_pattern tool requests
 *
 * AI-assisted pattern development using Propose → Test → Refine loop:
 * 1. Generate initial pattern from examples (LLM or heuristics)
 * 2. Test pattern against examples
 * 3. Analyze failures and refine pattern
 * 4. Iterate until success or max iterations reached
 *
 * @param args - Examples, context, max iterations, and dialect
 * @returns Pattern with test results, iteration history, and capture map
 */
export const handleProposePattern: ToolHandler<ProposePatternArgs, any> = (
  args
) => {
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
    };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(toMcpError(error, "Pattern proposal failed"))
    )
  );
};
