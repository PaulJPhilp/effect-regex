/**
 * Error Type Hierarchy
 *
 * This module defines tagged error types using Effect's Data.TaggedError.
 * Tagged errors enable type-safe error handling with Effect.catchTags.
 */

import { Data } from "effect";
import type { Ast } from "../core/ast.js";
import type { LintIssue } from "../core/linter.js";
import type { RegexTestCase } from "../core/tester.js";

/**
 * Dialect types for regex patterns
 */
export type Dialect = "js" | "re2" | "pcre";

/**
 * Error for regex pattern compilation failures
 *
 * Thrown when a regex pattern cannot be compiled by the JavaScript engine
 * or when pattern construction fails.
 */
export class RegexCompilationError extends Data.TaggedError(
  "RegexCompilationError"
)<{
  readonly pattern: string;
  readonly dialect: Dialect;
  readonly cause: unknown;
}> {}

/**
 * Error for pattern optimization failures
 *
 * Thrown when AST optimization encounters an unexpected condition
 * or produces invalid output.
 */
export class OptimizationError extends Data.TaggedError("OptimizationError")<{
  readonly ast: Ast;
  readonly phase: string;
  readonly reason: string;
}> {}

/**
 * Error for test execution failures
 *
 * Thrown when regex testing fails due to timeout, invalid pattern,
 * or execution errors.
 */
export class TestExecutionError extends Data.TaggedError(
  "TestExecutionError"
)<{
  readonly pattern: string;
  readonly testCase?: RegexTestCase;
  readonly reason: string;
  readonly timedOut?: boolean;
}> {}

/**
 * Error for validation/linting failures
 *
 * Thrown when pattern validation detects issues with dialect compatibility
 * or pattern safety.
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly pattern: string;
  readonly issues: readonly LintIssue[];
  readonly dialect: Dialect;
}> {}

/**
 * Error for dialect incompatibility
 *
 * Thrown when a pattern uses features not supported by the target dialect
 * (e.g., named groups in RE2, lookahead in restricted modes).
 */
export class DialectIncompatibilityError extends Data.TaggedError(
  "DialectIncompatibilityError"
)<{
  readonly dialect: Dialect;
  readonly feature: string;
  readonly pattern: string;
}> {}

/**
 * Error for code interpretation (AI-generated code)
 *
 * Thrown when LLM-generated RegexBuilder code cannot be parsed
 * or contains unsafe constructs.
 */
export class CodeInterpreterError extends Data.TaggedError(
  "CodeInterpreterError"
)<{
  readonly code: string;
  readonly reason: string;
  readonly cause?: unknown;
}> {}

/**
 * Error for pattern emission
 *
 * Thrown when converting RegexBuilder AST to regex string fails.
 */
export class EmitError extends Data.TaggedError("EmitError")<{
  readonly builder: unknown; // RegexBuilder (avoiding circular dependency)
  readonly dialect: Dialect;
  readonly cause: unknown;
}> {}

/**
 * Error for LLM API calls
 *
 * Thrown when LLM provider API calls fail.
 */
export class LLMError extends Data.TaggedError("LLMError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error for LLM configuration issues
 *
 * Thrown when LLM configuration is invalid or missing required fields.
 */
export class LLMConfigError extends Data.TaggedError("LLMConfigError")<{
  readonly provider: string;
  readonly reason: string;
}> {}

/**
 * Error for LLM rate limiting
 *
 * Thrown when LLM provider returns 429 rate limit response.
 */
export class LLMRateLimitError extends Data.TaggedError("LLMRateLimitError")<{
  readonly retryAfter?: number;
}> {}

/**
 * Union of all library errors
 *
 * This type can be used in Effect signatures that may produce any
 * library error type.
 */
export type RegexLibraryError =
  | RegexCompilationError
  | OptimizationError
  | TestExecutionError
  | ValidationError
  | DialectIncompatibilityError
  | CodeInterpreterError
  | EmitError
  | LLMError
  | LLMConfigError
  | LLMRateLimitError;
