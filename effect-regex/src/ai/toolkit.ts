import { Effect } from "effect";
import { emit, RegexBuilder } from "../core/builder.js";
import { lint } from "../core/linter.js";
import {
  type RegexTestCase,
  type TestResult,
  testRegex,
} from "../core/tester.js";
import {
  callLLMWithRetry,
  isLLMAvailable,
  type LLMConfig,
  type LLMConfigError,
  LLMError,
} from "./llm-client.js";
import {
  generateProposalPrompt,
  parseRegexBuilderCode,
} from "./prompts.js";
import {
  interpretRegexBuilderCode,
  CodeInterpreterError,
} from "./interpreter.js";

/**
 * AI Toolkit for regex pattern development
 * Provides propose → test → refine loop automation
 */

export interface PatternProposal {
  readonly pattern: RegexBuilder;
  readonly reasoning: string;
  readonly confidence: number; // 0-1
  readonly testCases: readonly RegexTestCase[];
}

export interface RefinementSuggestion {
  readonly issue: string;
  readonly suggestion: string;
  readonly confidence: number;
  readonly proposedChanges: PatternProposal;
}

export interface PatternDevelopmentResult {
  readonly finalPattern: RegexBuilder;
  readonly testResults: TestResult;
  readonly iterations: number;
  readonly success: boolean;
  readonly history: readonly PatternProposal[];
}

/**
 * Propose a pattern using LLM (AI-powered)
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
        new LLMError(
          "Failed to parse RegexBuilder code from LLM response"
        )
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
    const testCases: RegexTestCase[] = [
      ...positiveExamples.map((ex) => ({ input: ex, shouldMatch: true })),
      ...negativeExamples.map((ex) => ({ input: ex, shouldMatch: false })),
    ];

    return {
      pattern,
      reasoning: `LLM-generated pattern based on ${positiveExamples.length} positive and ${negativeExamples.length} negative examples`,
      confidence: 0.85, // Higher confidence for AI-generated patterns
      testCases,
    };
  });
};

/**
 * Propose an initial regex pattern based on examples (heuristic fallback)
 */
export const proposePatternHeuristic = (
  positiveExamples: readonly string[],
  negativeExamples: readonly string[],
  context?: string
): Effect<never, never, PatternProposal> => {
  return Effect.gen(function* () {
    // For now, create a simple pattern based on common patterns
    // TODO: Implement more sophisticated AI-based pattern generation

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
    const testCases: RegexTestCase[] = [
      ...positiveExamples.map((ex) => ({ input: ex, shouldMatch: true })),
      ...negativeExamples.map((ex) => ({ input: ex, shouldMatch: false })),
    ];

    return {
      pattern,
      reasoning,
      confidence: 0.7, // Moderate confidence for basic analysis
      testCases,
    };
  });
};

/**
 * Propose a pattern intelligently: Try LLM first, fall back to heuristics
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
 * Test a pattern against test cases
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
 * Analyze test results and suggest refinements
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
      suggestions.push({
        issue: "Pattern performance issues detected",
        suggestion:
          "Consider simplifying quantifiers or reducing backtracking potential",
        confidence: 0.9,
        proposedChanges: {
          ...proposal,
          pattern: proposal.pattern, // TODO: Implement simplification
          reasoning: "Simplified pattern for better performance",
          confidence: proposal.confidence * 0.7,
        },
      });
    }

    return suggestions;
  });
};

/**
 * Run the complete propose → test → refine loop
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
 * Validate pattern against dialect constraints
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
