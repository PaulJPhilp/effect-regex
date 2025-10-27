/**
 * Input Validation Utilities for MCP Tools
 *
 * This module provides Effect-based validation functions for MCP tool inputs.
 * All validation errors are converted to McpError for consistent error handling.
 *
 * @module mcp/utils/validation
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { LIMITS } from "../types.js";

/**
 * Validate general tool input constraints
 *
 * Checks:
 * - Pattern length limits
 * - Test case count limits
 *
 * @param input - Any tool input to validate
 * @returns Effect that succeeds or fails with McpError
 */
export function validateInputEffect(
  input: any
): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    // Check pattern length
    if (typeof input === "string" && input.length > LIMITS.MAX_PATTERN_LENGTH) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Pattern too long: ${input.length} > ${LIMITS.MAX_PATTERN_LENGTH}`
        )
      );
    }

    // Check test case count
    if (
      input?.cases &&
      Array.isArray(input.cases) &&
      input.cases.length > LIMITS.MAX_TEST_CASES
    ) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Too many test cases: ${input.cases.length} > ${LIMITS.MAX_TEST_CASES}`
        )
      );
    }
    // No explicit return needed for void functions
  });
}

/**
 * Validate regex pattern string
 *
 * Checks if a pattern is a valid regex that can be compiled
 *
 * @param pattern - Pattern string to validate
 * @returns Effect that succeeds or fails with McpError
 */
export function validatePattern(
  pattern: string
): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    // Check pattern length
    if (pattern.length > LIMITS.MAX_PATTERN_LENGTH) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Pattern too long: ${pattern.length} > ${LIMITS.MAX_PATTERN_LENGTH}`
        )
      );
    }

    // Try to compile the pattern
    yield* Effect.try(() => new RegExp(pattern)).pipe(
      Effect.mapError(
        (error) =>
          new McpError(
            ErrorCode.InvalidParams,
            `Invalid regex pattern: ${(error as Error).message}`
          )
      ),
      Effect.map(() => {})
    );
  });
}

/**
 * Validate examples array for AI pattern proposal
 *
 * Checks:
 * - At least one positive example exists
 * - Example count limits
 * - No empty strings
 *
 * @param positiveExamples - Examples that should match
 * @param negativeExamples - Examples that should not match
 * @returns Effect that succeeds or fails with McpError
 */
export function validateExamples(
  positiveExamples: readonly string[],
  negativeExamples: readonly string[]
): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    // Check positive examples exist
    if (positiveExamples.length === 0) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          "At least one positive example is required"
        )
      );
    }

    // Check positive examples limit
    if (positiveExamples.length > LIMITS.MAX_POSITIVE_EXAMPLES) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Too many positive examples: ${positiveExamples.length} > ${LIMITS.MAX_POSITIVE_EXAMPLES}`
        )
      );
    }

    // Check negative examples limit
    if (negativeExamples.length > LIMITS.MAX_NEGATIVE_EXAMPLES) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Too many negative examples: ${negativeExamples.length} > ${LIMITS.MAX_NEGATIVE_EXAMPLES}`
        )
      );
    }

    // Check for empty strings
    const allExamples = [...positiveExamples, ...negativeExamples];
    if (allExamples.some((ex) => ex.length === 0)) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          "Examples cannot be empty strings"
        )
      );
    }
  });
}

/**
 * Validate context string length
 *
 * @param context - Optional context string
 * @returns Effect that succeeds or fails with McpError
 */
export function validateContext(
  context?: string
): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    if (context && context.length > LIMITS.MAX_CONTEXT_LENGTH) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Context too long: ${context.length} > ${LIMITS.MAX_CONTEXT_LENGTH}`
        )
      );
    }
  });
}

/**
 * Validate timeout value for test execution
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Effect that succeeds or fails with McpError
 */
export function validateTimeout(
  timeoutMs: number
): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    if (timeoutMs < 10) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Timeout too low: ${timeoutMs}ms < 10ms`
        )
      );
    }

    if (timeoutMs > 5000) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Timeout too high: ${timeoutMs}ms > 5000ms`
        )
      );
    }
  });
}

/**
 * Validate dialect value
 *
 * @param dialect - Dialect string to validate
 * @param validDialects - Array of valid dialect values
 * @returns Effect that succeeds or fails with McpError
 */
export function validateDialect(
  dialect: string,
  validDialects: readonly string[]
): Effect.Effect<never, McpError, void> {
  return Effect.gen(function* () {
    if (!validDialects.includes(dialect)) {
      yield* Effect.fail(
        new McpError(
          ErrorCode.InvalidParams,
          `Invalid dialect: ${dialect}. Must be one of: ${validDialects.join(", ")}`
        )
      );
    }
  });
}

/**
 * Convert any error to McpError for consistent error handling
 *
 * @param error - Error to convert
 * @param context - Context message for the error
 * @returns McpError
 */
export function toMcpError(error: unknown, context: string): McpError {
  if (error instanceof McpError) {
    return error;
  }
  return new McpError(
    ErrorCode.InternalError,
    `${context}: ${(error as Error).message || "Unknown error"}`
  );
}
