/**
 * AI-Powered Pattern Development Toolkit
 *
 * This module provides high-level automation for regex pattern development using
 * AI assistance. It implements a complete **Propose → Test → Refine** workflow that:
 *
 * 1. **Propose**: Generate patterns from examples (LLM or heuristics)
 * 2. **Test**: Validate patterns against test cases
 * 3. **Refine**: Analyze failures and suggest improvements
 *
 * **Workflow Overview**:
 * ```
 * Examples → [Propose] → Pattern → [Test] → Results → [Refine] → Improved Pattern
 *                ↑                                                      ↓
 *                └──────────────────────────────────────────────────────┘
 *                         (iterate until success or max iterations)
 * ```
 *
 * **Key Features**:
 * - LLM-powered pattern generation with heuristic fallback
 * - Automated testing and failure analysis
 * - Iterative refinement with confidence scoring
 * - Dialect validation (JavaScript, RE2, PCRE)
 * - Performance optimization integration
 *
 * @module ai/toolkit
 * @see {@link proposePattern} - Main entry point for pattern proposal
 * @see {@link developPattern} - Complete automated workflow
 */

import { Effect } from "effect";
import { emit, RegexBuilder } from "../core/builder.js";
import { lint } from "../core/linter.js";
import { optimize } from "../core/optimizer.js";
import {
  type RegexTestCase,
  type TestResult,
  testRegex,
} from "../core/tester.js";
import {
  CodeInterpreterError,
  interpretRegexBuilderCode,
} from "./interpreter.js";
import {
  callLLMWithRetry,
  isLLMAvailable,
  type LLMConfig,
  type LLMConfigError,
  LLMError,
} from "./llm-client.js";
import { generateProposalPrompt, parseRegexBuilderCode } from "./prompts.js";
import { createTestCasesFromExamples } from "./utils.js";

/**
 * AI-generated pattern proposal with metadata
 *
 * Result of asking an LLM or heuristic to generate a regex pattern.
 * Includes the pattern, reasoning, confidence score, and test cases.
 */
export interface PatternProposal {
  /** The generated RegexBuilder pattern */
  readonly pattern: RegexBuilder;
  /** Explanation of why this pattern was generated */
  readonly reasoning: string;
  /** Confidence score from 0-1 (1 = very confident) */
  readonly confidence: number;
  /** Test cases derived from the positive/negative examples */
  readonly testCases: readonly RegexTestCase[];
}

/**
 * Suggested pattern refinement based on test failures
 *
 * Provides actionable suggestions for fixing a pattern that failed tests,
 * along with a proposed improved pattern.
 */
export interface RefinementSuggestion {
  /** Description of what went wrong */
  readonly issue: string;
  /** Recommended fix */
  readonly suggestion: string;
  /** Confidence in this suggestion (0-1) */
  readonly confidence: number;
  /** Proposed improved pattern with changes applied */
  readonly proposedChanges: PatternProposal;
}

/**
 * Result of complete pattern development workflow
 *
 * Contains the final pattern, test results, iteration count,
 * success status, and full history of proposals tried.
 */
export interface PatternDevelopmentResult {
  /** The final pattern after all iterations */
  readonly finalPattern: RegexBuilder;
  /** Test results for the final pattern */
  readonly testResults: TestResult;
  /** Number of refinement iterations performed */
  readonly iterations: number;
  /** Whether the pattern passes all tests */
  readonly success: boolean;
  /** Full history of patterns tried (for debugging/analysis) */
  readonly history: readonly PatternProposal[];
}

/**
 * Propose a regex pattern using LLM reasoning
 *
 * Leverages an LLM to analyze examples and generate an appropriate regex pattern
 * using the RegexBuilder API. The LLM considers both positive and negative examples
 * to create a precise, maintainable pattern.
 *
 * **This is Step 1** of the AI-powered development workflow:
 * 1. **Propose**: Generate initial pattern ← YOU ARE HERE
 * 2. **Test**: Validate with {@link testPattern}
 * 3. **Refine**: Improve with {@link analyzeAndRefine}
 *
 * **Process**:
 * 1. Generate structured prompt with API reference and examples
 * 2. Call LLM with retry logic
 * 3. Parse and validate LLM response
 * 4. Safely interpret code without eval()
 * 5. Generate test cases from examples
 *
 * @param positiveExamples - Strings the pattern must match
 * @param negativeExamples - Strings the pattern must NOT match
 * @param context - Optional description of pattern purpose (e.g., "email addresses")
 * @param llmConfig - Optional LLM provider configuration
 * @returns Effect yielding PatternProposal or LLM errors
 * @example
 * ```typescript
 * const proposal = await Effect.runPromise(
 *   proposePatternWithLLM(
 *     ["hello@example.com", "user@test.org"],
 *     ["@example", "not-email"],
 *     "email addresses"
 *   )
 * );
 * console.log(proposal.reasoning);
 * // "LLM-generated pattern based on 2 positive and 2 negative examples"
 * console.log(proposal.confidence);  // 0.85
 * ```
 */
export const proposePatternWithLLM = (
  positiveExamples: readonly string[],
  negativeExamples: readonly string[],
  context?: string,
  llmConfig?: Partial<LLMConfig>
): Effect<LLMError | LLMConfigError, never, PatternProposal> => {
  return Effect.gen(function* () {
    // Generate prompt
    const prompt = generateProposalPrompt(
      positiveExamples,
      negativeExamples,
      context
    );

    // Call LLM
    const response = yield* callLLMWithRetry(prompt, llmConfig);

    // Parse response
    const code = parseRegexBuilderCode(response);
    if (!code) {
      return yield* Effect.fail(
        new LLMError("Failed to parse RegexBuilder code from LLM response")
      );
    }

    // Safely interpret the code without eval()
    let pattern: RegexBuilder;
    try {
      pattern = interpretRegexBuilderCode(code);
    } catch (error) {
      if (error instanceof CodeInterpreterError) {
        return yield* Effect.fail(
          new LLMError(
            `Failed to interpret LLM-generated code: ${error.message}`,
            error
          )
        );
      }
      // Unexpected error - re-throw
      throw error;
    }

    // Generate test cases from examples
    const testCases = createTestCasesFromExamples(
      positiveExamples,
      negativeExamples
    );

    return {
      pattern,
      reasoning: `LLM-generated pattern based on ${positiveExamples.length} positive and ${negativeExamples.length} negative examples`,
      confidence: 0.85, // Higher confidence for AI-generated patterns
      testCases,
    };
  });
};

/**
 * Propose a regex pattern using heuristic analysis (fallback)
 *
 * Generates patterns using simple heuristics when LLM is unavailable or fails.
 * Analyzes examples to detect common patterns (quotes, numbers, paths, words)
 * and returns an appropriate RegexBuilder pattern.
 *
 * **Use Case**: Automatic fallback when {@link proposePatternWithLLM} fails
 *
 * **Detection Heuristics**:
 * - Quoted strings → `lit('"').then(any().zeroOrMore()).then(lit('"'))`
 * - Pure numbers → `digit().oneOrMore()`
 * - Paths (/ or \) → `any().oneOrMore()`
 * - Default → `word().oneOrMore()`
 *
 * @param positiveExamples - Strings the pattern must match
 * @param negativeExamples - Strings the pattern must NOT match (unused in heuristic)
 * @param context - Optional context (unused in heuristic)
 * @returns Effect yielding heuristic-based PatternProposal (confidence: 0.7)
 * @example
 * ```typescript
 * const proposal = await Effect.runPromise(
 *   proposePatternHeuristic(["123", "456", "789"], [])
 * );
 * // proposal.pattern === RegexBuilder.digit().oneOrMore()
 * // proposal.confidence === 0.7
 * ```
 */
export const proposePatternHeuristic = (
  positiveExamples: readonly string[],
  negativeExamples: readonly string[],
  context?: string
): Effect<never, never, PatternProposal> => {
  return Effect.gen(function* () {
    // Heuristic-based pattern generation (fallback when LLM unavailable)
    // Note: For production use, prefer proposePatternWithLLM or proposePattern (which tries LLM first)

    // Analyze examples to determine pattern type
    const hasQuotes = positiveExamples.some(
      (ex) => ex.includes('"') || ex.includes("'")
    );
    const hasNumbers = positiveExamples.some((ex) => /\d/.test(ex));
    const hasPaths = positiveExamples.some(
      (ex) => ex.includes("/") || ex.includes("\\")
    );

    let pattern: RegexBuilder;
    let reasoning: string;

    if (hasQuotes) {
      pattern = RegexBuilder.lit('"')
        .then(RegexBuilder.any().zeroOrMore())
        .then(RegexBuilder.lit('"'));
      reasoning =
        "Detected quoted strings in examples, proposing quoted string pattern";
    } else if (hasNumbers && positiveExamples.every((ex) => /^\d+$/.test(ex))) {
      pattern = RegexBuilder.digit().oneOrMore();
      reasoning = "All examples are numeric, proposing digit pattern";
    } else if (hasPaths) {
      pattern = RegexBuilder.any().oneOrMore();
      reasoning = "Detected path-like structures, proposing general pattern";
    } else {
      pattern = RegexBuilder.word().oneOrMore();
      reasoning = "Defaulting to word pattern for text matching";
    }

    // Generate test cases from examples
    const testCases = createTestCasesFromExamples(
      positiveExamples,
      negativeExamples
    );

    return {
      pattern,
      reasoning,
      confidence: 0.7, // Moderate confidence for basic analysis
      testCases,
    };
  });
};

/**
 * Propose a pattern intelligently with automatic LLM/heuristic selection
 *
 * **Recommended entry point** for pattern proposal. Tries LLM first for best results,
 * automatically falls back to heuristics if LLM unavailable or fails.
 *
 * **Selection Logic**:
 * 1. Check if LLM is available (API key present)
 * 2. If yes → Try {@link proposePatternWithLLM}
 * 3. If LLM fails or unavailable → Fall back to {@link proposePatternHeuristic}
 *
 * @param positiveExamples - Strings the pattern must match
 * @param negativeExamples - Strings the pattern must NOT match
 * @param context - Optional description of pattern purpose
 * @param llmConfig - Optional LLM configuration
 * @returns Effect yielding PatternProposal (never fails, always returns a pattern)
 * @example
 * ```typescript
 * // Will use LLM if available, fallback to heuristics otherwise
 * const proposal = await Effect.runPromise(
 *   proposePattern(["test123", "demo456"], ["abc"])
 * );
 * // proposal.confidence: 0.85 (LLM) or 0.7 (heuristic)
 * ```
 */
export const proposePattern = (
  positiveExamples: readonly string[],
  negativeExamples: readonly string[],
  context?: string,
  llmConfig?: Partial<LLMConfig>
): Effect<never, never, PatternProposal> => {
  return Effect.gen(function* () {
    // Check if LLM is available
    const llmAvailable = yield* isLLMAvailable(
      llmConfig?.provider || "anthropic"
    );

    if (llmAvailable) {
      // Try LLM-based generation
      const llmResult = yield* Effect.either(
        proposePatternWithLLM(
          positiveExamples,
          negativeExamples,
          context,
          llmConfig
        )
      );

      if (llmResult._tag === "Right") {
        return llmResult.right;
      }

      // LLM failed, log and fall back
      console.warn(
        "LLM pattern generation failed, falling back to heuristics:",
        llmResult.left.message
      );
    }

    // Fall back to heuristic-based generation
    return yield* proposePatternHeuristic(
      positiveExamples,
      negativeExamples,
      context
    );
  });
};

/**
 * Test a RegexBuilder pattern against test cases
 *
 * **Step 2** of the AI workflow. Emits the pattern to a regex string
 * and validates it against test cases using the {@link testRegex} function.
 *
 * @param pattern - RegexBuilder pattern to test
 * @param testCases - Array of test cases with expected match results
 * @param dialect - Target regex dialect (default: "js")
 * @param timeoutMs - Timeout per test case (default: 100ms)
 * @returns Effect yielding TestResult with pass/fail statistics
 * @example
 * ```typescript
 * const pattern = RegexBuilder.digit().oneOrMore();
 * const result = await Effect.runPromise(
 *   testPattern(pattern, [
 *     { input: "123", shouldMatch: true },
 *     { input: "abc", shouldMatch: false }
 *   ])
 * );
 * // result.passed === 2, result.failed === 0
 * ```
 */
export const testPattern = (
  pattern: RegexBuilder,
  testCases: readonly RegexTestCase[],
  dialect: "js" | "re2-sim" | "re2" = "js",
  timeoutMs = 100
): Effect<never, never, TestResult> =>
  Effect.gen(function* () {
    const regexResult = emit(pattern);
    const testResult = yield* testRegex(
      regexResult.pattern,
      dialect,
      testCases,
      timeoutMs
    );
    return testResult;
  });

/**
 * Analyze test failures and suggest pattern improvements
 *
 * **Step 3** of the AI workflow. Examines failed test cases to determine
 * whether the pattern is too restrictive or too permissive, then suggests
 * targeted fixes with proposed improved patterns.
 *
 * **Analysis Categories**:
 * - **Too Restrictive**: Should match but doesn't → Add alternatives
 * - **Too Permissive**: Shouldn't match but does → Add exclusions
 * - **Performance**: Timeouts detected → Apply optimization
 *
 * @param proposal - The pattern proposal that was tested
 * @param testResults - Test results from {@link testPattern}
 * @returns Effect yielding array of RefinementSuggestions sorted by confidence
 * @example
 * ```typescript
 * const suggestions = await Effect.runPromise(
 *   analyzeAndRefine(proposal, testResults)
 * );
 * suggestions.forEach(s => {
 *   console.log(`Issue: ${s.issue}`);
 *   console.log(`Fix: ${s.suggestion}`);
 *   console.log(`Confidence: ${s.confidence}`);
 * });
 * ```
 */
export const analyzeAndRefine = (
  proposal: PatternProposal,
  testResults: TestResult
): Effect<never, never, RefinementSuggestion[]> => {
  return Effect.gen(function* () {
    const suggestions: RefinementSuggestion[] = [];

    // Analyze failures
    for (const failure of testResults.failures) {
      const testCase = proposal.testCases[failure.caseIndex];
      const shouldMatch = testCase.shouldMatch;
      const didMatch = failure.matched;

      if (shouldMatch && !didMatch) {
        // Should match but didn't - pattern too restrictive
        suggestions.push({
          issue: `Pattern fails to match: "${testCase.input}"`,
          suggestion:
            "Consider making the pattern more permissive or adding alternatives",
          confidence: 0.8,
          proposedChanges: {
            ...proposal,
            pattern: proposal.pattern.or(RegexBuilder.lit(testCase.input)),
            reasoning: `Added alternative for failing example: ${testCase.input}`,
            confidence: proposal.confidence * 0.9,
          },
        });
      } else if (!shouldMatch && didMatch) {
        // Shouldn't match but did - pattern too permissive
        suggestions.push({
          issue: `Pattern incorrectly matches: "${testCase.input}"`,
          suggestion:
            "Consider making the pattern more specific or adding exclusions",
          confidence: 0.7,
          proposedChanges: {
            ...proposal,
            pattern: RegexBuilder.alt(
              proposal.pattern,
              RegexBuilder.lit(testCase.input).then(RegexBuilder.lit("(?!.*)")) // Negative lookahead
            ),
            reasoning: `Added exclusion for incorrectly matching example: ${testCase.input}`,
            confidence: proposal.confidence * 0.8,
          },
        });
      }
    }

    // Check for performance issues
    if (testResults.warnings.some((w) => w.includes("timeout"))) {
      // Attempt to optimize the pattern to improve performance
      const ast = proposal.pattern.getAst();
      const optimized = optimize(ast);
      const simplifiedPattern = RegexBuilder.fromAst(optimized.optimized);

      suggestions.push({
        issue: "Pattern performance issues detected",
        suggestion:
          "Consider simplifying quantifiers or reducing backtracking potential",
        confidence: 0.9,
        proposedChanges: {
          ...proposal,
          pattern: simplifiedPattern,
          reasoning: `Simplified pattern for better performance (reduced ${optimized.nodesReduced} AST nodes)`,
          confidence: proposal.confidence * 0.7,
        },
      });
    }

    return suggestions;
  });
};

/**
 * Run the complete AI-powered pattern development workflow
 *
 * **Highest-level automation** - Implements the full Propose → Test → Refine loop:
 * 1. Generate initial pattern from examples
 * 2. Test pattern against generated test cases
 * 3. If failures, analyze and refine
 * 4. Repeat until success or max iterations
 *
 * **Workflow**:
 * ```
 * Examples → Propose → Test → Pass? → ✓ Success
 *                        ↓
 *                      Fail → Analyze → Refine → Test → ...
 * ```
 *
 * **Termination Conditions**:
 * - All tests pass with no warnings → Success
 * - Max iterations reached → Return best attempt
 * - No refinement suggestions available → Return current
 *
 * @param positiveExamples - Strings the pattern must match
 * @param negativeExamples - Strings the pattern must NOT match
 * @param maxIterations - Maximum refinement iterations (default: 3)
 * @param dialect - Target regex dialect (default: "js")
 * @returns Effect yielding PatternDevelopmentResult with history
 * @example
 * ```typescript
 * const result = await Effect.runPromise(
 *   developPattern(
 *     ["user@example.com", "test@test.org"],
 *     ["@example", "not-email"],
 *     3,
 *     "js"
 *   )
 * );
 * console.log(`Success: ${result.success}`);
 * console.log(`Iterations: ${result.iterations}`);
 * console.log(`Final pattern: ${emit(result.finalPattern).pattern}`);
 * result.history.forEach((p, i) => {
 *   console.log(`Attempt ${i}: ${p.reasoning}`);
 * });
 * ```
 */
export const developPattern = (
  positiveExamples: readonly string[],
  negativeExamples: readonly string[],
  maxIterations = 3,
  dialect: "js" | "re2-sim" | "re2" = "js"
): Effect<never, never, PatternDevelopmentResult> => {
  return Effect.gen(function* () {
    const history: PatternProposal[] = [];

    // Initial proposal
    let currentProposal = yield* proposePattern(
      positiveExamples,
      negativeExamples
    );
    history.push(currentProposal);

    for (let i = 0; i < maxIterations; i++) {
      // Test current pattern
      const testResults = yield* testPattern(
        currentProposal.pattern,
        currentProposal.testCases,
        dialect
      );

      // Check if we have a successful pattern
      if (testResults.failed === 0 && testResults.warnings.length === 0) {
        return {
          finalPattern: currentProposal.pattern,
          testResults,
          iterations: i + 1,
          success: true,
          history,
        };
      }

      // Get refinement suggestions
      const suggestions = yield* analyzeAndRefine(currentProposal, testResults);

      if (suggestions.length === 0) {
        // No suggestions available
        break;
      }

      // Apply the highest confidence suggestion
      const bestSuggestion = suggestions.sort(
        (a, b) => b.confidence - a.confidence
      )[0];
      currentProposal = bestSuggestion.proposedChanges;
      history.push(currentProposal);
    }

    // Return best result after max iterations
    const finalTestResults = yield* testPattern(
      currentProposal.pattern,
      currentProposal.testCases,
      dialect
    );

    return {
      finalPattern: currentProposal.pattern,
      testResults: finalTestResults,
      iterations: maxIterations,
      success: finalTestResults.failed === 0,
      history,
    };
  });
};

/**
 * Validate a pattern for dialect compatibility
 *
 * Checks if a RegexBuilder pattern is compatible with a specific regex dialect.
 * Uses the {@link lint} function to detect dialect-specific issues like
 * unsupported features (e.g., lookbehind in RE2).
 *
 * **Checks For**:
 * - Named groups support
 * - Lookbehind assertion support
 * - Backreference support
 * - Dialect-specific limitations
 *
 * @param pattern - RegexBuilder pattern to validate
 * @param dialect - Target dialect to validate for (js, re2, or pcre)
 * @returns Effect yielding validation result with issues array
 * @example
 * ```typescript
 * const pattern = RegexBuilder.digit()
 *   .capture("num")
 *   .then(RegexBuilder.backref("num"));
 *
 * const jsResult = await Effect.runPromise(
 *   validateForDialect(pattern, "js")
 * );
 * // jsResult.valid === true (JS supports backrefs)
 *
 * const re2Result = await Effect.runPromise(
 *   validateForDialect(pattern, "re2")
 * );
 * // re2Result.valid === false
 * // re2Result.issues === ["Backreferences not supported in RE2"]
 * ```
 */
export const validateForDialect = (
  pattern: RegexBuilder,
  dialect: "js" | "re2" | "pcre"
): Effect<never, never, { valid: boolean; issues: readonly string[] }> =>
  Effect.gen(function* () {
    const result = emit(pattern, dialect);
    const lintResult = lint(result.ast, dialect);

    return {
      valid: lintResult.valid,
      issues: lintResult.issues.map((issue) => issue.message),
    };
  });
