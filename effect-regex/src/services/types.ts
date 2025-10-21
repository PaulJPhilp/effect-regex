/**
 * Service Layer Type Definitions
 *
 * This module defines the service interfaces for the Effect-based architecture.
 * Services provide dependency injection and composable layers for core functionality.
 */

import { Context, Effect } from "effect";
import type { RegexBuilder, RegexPattern } from "../core/builder.js";
import type { LintResult } from "../core/linter.js";
import type { TestResult, RegexTestCase } from "../core/tester.js";
import type {
  OptimizationResult,
  OptimizationOptions,
} from "../core/optimizer.js";
import type { Ast } from "../core/ast.js";
import type { LLMConfig, LLMProvider } from "../ai/llm-client.js";
import type { PatternProposal } from "../ai/toolkit.js";

/**
 * Service for regex pattern building and emission
 *
 * Provides core regex operations: emit, lint, optimize
 */
export interface RegexBuilderService {
  /**
   * Emit a regex pattern from builder
   */
  readonly emit: (
    builder: RegexBuilder,
    dialect?: "js" | "re2" | "pcre",
    anchor?: boolean
  ) => Effect.Effect<RegexPattern, Error>;

  /**
   * Lint a pattern AST for dialect compatibility
   */
  readonly lint: (
    ast: Ast,
    dialect?: "js" | "re2" | "pcre"
  ) => Effect.Effect<LintResult, never>;

  /**
   * Optimize a pattern AST (pure function)
   * Note: This is a pure function, not wrapped in Effect
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
   */
  readonly call: (
    prompt: string,
    config?: Partial<LLMConfig>
  ) => Effect.Effect<string, Error>;

  /**
   * Check if LLM provider is available
   */
  readonly isAvailable: (provider: LLMProvider) => Effect.Effect<boolean>;

  /**
   * Propose pattern from examples using LLM
   */
  readonly proposePattern: (
    positiveExamples: readonly string[],
    negativeExamples: readonly string[],
    context?: string,
    config?: Partial<LLMConfig>
  ) => Effect.Effect<PatternProposal, Error>;
}

/**
 * Context tag for LLMService
 */
export const LLMService = Context.GenericTag<LLMService>("@services/LLMService");

/**
 * Service for pattern validation and testing
 *
 * Provides testing and validation operations with timeout protection
 */
export interface ValidationService {
  /**
   * Test regex against test cases
   */
  readonly test: (
    pattern: string,
    dialect: "js" | "re2-sim" | "re2",
    cases: readonly RegexTestCase[],
    timeoutMs?: number
  ) => Effect.Effect<TestResult, Error>;

  /**
   * Validate pattern for dialect compatibility
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
