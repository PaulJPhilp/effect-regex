/**
 * LLMService Implementation
 *
 * Provides AI/LLM integration through a service layer:
 * - call: Make LLM API calls with retry logic
 * - isAvailable: Check if LLM provider is configured
 * - proposePattern: Generate regex patterns from examples using LLM
 */

import { Effect, Layer } from "effect";
import { interpretRegexBuilderCode } from "../ai/interpreter.js";
import { callLLMWithRetry, isLLMAvailable } from "../ai/llm-client.js";
import {
  generateProposalPrompt,
  parseRegexBuilderCode,
} from "../ai/prompts.js";
import { RegexBuilder } from "../core/builder.js";
import {
  CodeInterpreterError,
  type LLMConfigError,
  LLMError,
  type LLMRateLimitError,
} from "../errors/index.js";
import { LLMService } from "./types.js";

/**
 * Live implementation using real Anthropic/OpenAI/etc APIs
 */
export const LLMServiceLive = Layer.succeed(LLMService, {
  call: (prompt, config) =>
    callLLMWithRetry(prompt, config).pipe(
      Effect.mapError((error) => {
        // Convert existing LLM errors to tagged errors
        if ("_tag" in error) {
          // Already a tagged error from llm-client
          return error as LLMError | LLMConfigError | LLMRateLimitError;
        }
        // Convert generic error to LLMError
        return new LLMError({
          message: error instanceof Error ? error.message : String(error),
          cause: error,
        });
      })
    ),

  isAvailable: isLLMAvailable,

  proposePattern: (positiveExamples, negativeExamples, context, config) =>
    Effect.gen(function* () {
      const prompt = generateProposalPrompt(
        positiveExamples,
        negativeExamples,
        context
      );

      const response = yield* callLLMWithRetry(prompt, config).pipe(
        Effect.mapError((error) => {
          // Convert existing LLM errors to tagged errors
          if ("_tag" in error) {
            return error as LLMError | LLMConfigError | LLMRateLimitError;
          }
          return new LLMError({
            message: error instanceof Error ? error.message : String(error),
            cause: error,
          });
        })
      );

      const code = parseRegexBuilderCode(response);
      if (!code) {
        return yield* Effect.fail(
          new LLMError({
            message: "Failed to parse RegexBuilder code from LLM response",
          })
        );
      }

      let pattern: RegexBuilder;
      try {
        pattern = interpretRegexBuilderCode(code);
      } catch (error) {
        return yield* Effect.fail(
          new CodeInterpreterError({
            code,
            reason: error instanceof Error ? error.message : String(error),
            cause: error,
          })
        );
      }

      const testCases = [
        ...positiveExamples.map((ex) => ({ input: ex, shouldMatch: true })),
        ...negativeExamples.map((ex) => ({ input: ex, shouldMatch: false })),
      ];

      return {
        pattern,
        reasoning: `LLM-generated pattern based on ${positiveExamples.length} positive and ${negativeExamples.length} negative examples`,
        confidence: 0.85,
        testCases,
      };
    }),
});

/**
 * Mock implementation for testing (no API calls)
 */
export const LLMServiceMock = Layer.succeed(LLMService, {
  call: (prompt, _config) =>
    Effect.succeed("RegexBuilder.lit('mocked').oneOrMore()"),

  isAvailable: (_provider) => Effect.succeed(true),

  proposePattern: (positiveExamples, negativeExamples, _context, _config) =>
    Effect.succeed({
      pattern: RegexBuilder.lit("mock").oneOrMore(),
      reasoning: "Mocked pattern for testing",
      confidence: 0.7,
      testCases: [
        ...positiveExamples.map((ex) => ({ input: ex, shouldMatch: true })),
        ...negativeExamples.map((ex) => ({ input: ex, shouldMatch: false })),
      ],
    }),
});
