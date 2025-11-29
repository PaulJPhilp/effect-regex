/**
 * Service Layer Type Definitions
 *
 * This module defines the service interfaces for the Effect-based architecture.
 * Services provide dependency injection and composable layers for core functionality.
 */

import { Context, type Effect } from "effect";
import type { LLMConfig, LLMProvider } from "../ai/llm-client.js";
import type { PatternProposal } from "../ai/toolkit.js";
import type { Ast } from "../core/ast.js";
import type { RegexBuilder, RegexPattern } from "../core/builder.js";
import type { LintResult } from "../core/linter.js";
import type {
  OptimizationOptions,
  OptimizationResult,
} from "../core/optimizer.js";
import type { RegexTestCase, TestResult } from "../core/tester.js";
import type {
  CodeInterpreterError,
  EmitError,
  LLMConfigError,
  LLMError,
  LLMRateLimitError,
  TestExecutionError,
} from "../errors/index.js";

/**
 * Service for regex pattern building and emission
 *
 * Provides core regex operations: emit, lint, optimize
 */
export interface RegexBuilderService {
  /**
   * Emit a regex pattern from builder
   *
   * @throws EmitError when pattern emission fails
   */
  readonly emit: (
    builder: RegexBuilder,
    dialect?: "js" | "re2" | "pcre",
    anchor?: boolean
  ) => Effect.Effect<RegexPattern, EmitError>;

  /**
   * Lint a pattern AST for dialect compatibility
   *
   * Note: Linting never fails - it returns validation results
   */
  readonly lint: (
    ast: Ast,
    dialect?: "js" | "re2" | "pcre"
  ) => Effect.Effect<LintResult, never>;

  /**
   * Optimize a pattern AST (pure function)
   *
   * Note: This is a pure function, not wrapped in Effect.
   * Optimization is deterministic and cannot fail.
   */
  readonly optimize: (
    ast: Ast,
    options?: OptimizationOptions
  ) => OptimizationResult;
}

/**
 * Context tag for RegexBuilderService
 */
export const RegexBuilderService = Context.GenericTag<RegexBuilderService>(
  "@services/RegexBuilderService"
);

/**
 * Service for AI/LLM integration
 *
 * Provides LLM-based pattern generation and analysis
 */
export interface LLMService {
  /**
   * Call LLM with prompt
   *
   * @throws LLMError when API call fails
   * @throws LLMConfigError when configuration is invalid
   * @throws LLMRateLimitError when rate limit is exceeded
   */
  readonly call: (
    prompt: string,
    config?: Partial<LLMConfig>
  ) => Effect.Effect<string, LLMError | LLMConfigError | LLMRateLimitError>;

  /**
   * Check if LLM provider is available
   *
   * Note: Never fails - returns false if unavailable
   */
  readonly isAvailable: (provider: LLMProvider) => Effect.Effect<boolean>;

  /**
   * Propose pattern from examples using LLM
   *
   * @throws LLMError when API call fails
   * @throws LLMConfigError when configuration is invalid
   * @throws LLMRateLimitError when rate limit is exceeded
   * @throws CodeInterpreterError when generated code is invalid
   */
  readonly proposePattern: (
    positiveExamples: readonly string[],
    negativeExamples: readonly string[],
    context?: string,
    config?: Partial<LLMConfig>
  ) => Effect.Effect<
    PatternProposal,
    LLMError | LLMConfigError | LLMRateLimitError | CodeInterpreterError
  >;
}

/**
 * Context tag for LLMService
 */
export const LLMService = Context.GenericTag<LLMService>(
  "@services/LLMService"
);

/**
 * Service for pattern validation and testing
 *
 * Provides testing and validation operations with timeout protection
 */
export interface ValidationService {
  /**
   * Test regex against test cases
   *
   * @throws TestExecutionError when pattern execution fails or times out
   */
  readonly test: (
    pattern: string,
    cases: readonly RegexTestCase[],
    dialect?: "js" | "re2-sim" | "re2",
    timeoutMs?: number
  ) => Effect.Effect<TestResult, TestExecutionError>;

  /**
   * Validate pattern for dialect compatibility
   *
   * Note: Never fails - returns validation results
   */
  readonly validateForDialect: (
    pattern: RegexBuilder,
    dialect: "js" | "re2" | "pcre"
  ) => Effect.Effect<{ valid: boolean; issues: readonly string[] }, never>;
}

/**
 * Context tag for ValidationService
 */
export const ValidationService = Context.GenericTag<ValidationService>(
  "@services/ValidationService"
);
