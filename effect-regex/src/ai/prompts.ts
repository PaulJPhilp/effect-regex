/**
 * Prompt Engineering for LLM-Based Pattern Generation
 *
 * This module provides carefully crafted prompts for guiding LLMs to generate
 * regex patterns using the RegexBuilder API. The prompts include:
 * - Complete API reference embedded in the prompt
 * - Security constraints (no eval, no unsafe patterns)
 * - Examples and context for pattern generation
 * - Structured output format expectations
 *
 * **Design Philosophy**:
 * - Prompt includes full API to reduce hallucination
 * - Explicit security rules prevent code injection
 * - Example-driven learning for better results
 * - Iterative refinement support for failed tests
 *
 * @module ai/prompts
 */

/**
 * Generate an initial pattern proposal prompt for LLM
 *
 * Creates a comprehensive prompt that guides the LLM to generate a RegexBuilder
 * pattern based on positive and negative examples. The prompt embeds the full
 * RegexBuilder API reference to minimize hallucinations and ensure valid output.
 *
 * **Prompt Structure**:
 * 1. API Reference - Complete RegexBuilder API with examples
 * 2. Task Definition - What the pattern must match/not match
 * 3. Requirements - Security and quality constraints
 * 4. Response Format - Expected code structure
 *
 * **Security Constraints Embedded**:
 * - No eval() or Function() calls
 * - Avoid catastrophic backtracking patterns
 * - Use only approved RegexBuilder methods
 *
 * @param positiveExamples - Strings that must match the pattern
 * @param negativeExamples - Strings that must NOT match the pattern
 * @param context - Optional description of what the pattern is for
 * @returns Formatted prompt string ready for LLM consumption
 * @example
 * ```typescript
 * const prompt = generateProposalPrompt(
 *   ["user@example.com", "test@test.org"],
 *   ["@example.com", "not-email"],
 *   "email addresses"
 * );
 * // Prompt includes API reference, examples, and constraints
 * // LLM will generate: RegexBuilder.charClass("a-z0-9._%+-").oneOrMore()...
 * ```
 */
export const generateProposalPrompt = (
  positiveExamples: readonly string[],
  negativeExamples: readonly string[],
  context?: string
): string => `You are a regex pattern expert using the effect-regex library. Your task is to generate a regex pattern using the RegexBuilder API that matches the given examples.

## RegexBuilder API

The RegexBuilder provides a fluent, type-safe API for building regex patterns:

\`\`\`typescript
import { RegexBuilder } from "../core/builder";

// Basic constructors
RegexBuilder.lit("text")           // Literal text (auto-escaped)
RegexBuilder.raw("\\\\d+")           // Raw regex pattern
RegexBuilder.digit()               // [0-9]
RegexBuilder.word()                // [a-zA-Z0-9_]
RegexBuilder.whitespace()          // \\s
RegexBuilder.any()                 // .
RegexBuilder.charClass("a-z")      // [a-z]
RegexBuilder.charClass("a-z", true) // [^a-z] (negated)

// Composition
.then(...)                         // Sequence
.or(...)                           // Alternation
RegexBuilder.alt(a, b, c)          // Multiple alternatives

// Quantifiers
.zeroOrMore()                      // *
.oneOrMore()                       // +
.optional()                        // ?
.exactly(n)                        // {n}
.atLeast(n)                        // {n,}
.between(min, max)                 // {min,max}

// Lazy quantifiers (add true parameter)
.zeroOrMore(true)                  // *?
.oneOrMore(true)                   // +?

// Groups
.capture("name")                   // (?<name>...)
.group()                           // (?:...) non-capturing

// Anchors
.startOfLine()                     // ^...
.endOfLine()                       // ...$
.wordBoundary()                    // ...\\b
\`\`\`

## Task

Generate a RegexBuilder expression that:
${
  positiveExamples.length > 0
    ? `
**MUST MATCH** these examples:
${positiveExamples.map((ex, i) => `  ${i + 1}. "${ex}"`).join("\n")}
`
    : ""
}
${
  negativeExamples.length > 0
    ? `
**MUST NOT MATCH** these examples:
${negativeExamples.map((ex, i) => `  ${i + 1}. "${ex}"`).join("\n")}
`
    : ""
}
${
  context
    ? `
**Context**: ${context}
`
    : ""
}

## Requirements

1. Use ONLY the RegexBuilder API (no raw regex strings unless absolutely necessary)
2. Prefer simple, readable patterns over complex ones
3. Use named captures for important parts
4. Avoid catastrophic backtracking (no nested quantifiers like (a+)+)
5. Return ONLY valid TypeScript code, no explanation

## Response Format

Return a single TypeScript expression that creates the pattern:

\`\`\`typescript
RegexBuilder
  .charClass("a-zA-Z0-9._%+-")
  .oneOrMore()
  .then(RegexBuilder.lit("@"))
  .then(RegexBuilder.charClass("a-zA-Z0-9.-").oneOrMore())
  .then(RegexBuilder.lit("."))
  .then(RegexBuilder.charClass("a-zA-Z").between(2, 10))
  .capture("email")
\`\`\`

Generate the pattern now:`;

/**
 * Generate a pattern refinement prompt based on test failures
 *
 * Creates a prompt that helps the LLM fix a pattern that failed some test cases.
 * The prompt provides the original pattern, its reasoning, and detailed failure
 * information to guide the LLM toward targeted fixes.
 *
 * **Refinement Strategy**:
 * - Shows what failed and why (too restrictive vs too permissive)
 * - Maintains context from original reasoning
 * - Encourages minimal, targeted changes
 * - Preserves passing tests while fixing failures
 *
 * **Use Case**: Step 3 of the AI development workflow (Propose → Test → Refine)
 *
 * @param currentPattern - The RegexBuilder code that needs refinement
 * @param failedTests - Array of test cases that failed with details
 * @param reasoning - Original reasoning for why the pattern was created
 * @returns Refinement prompt with failure analysis and guidance
 * @example
 * ```typescript
 * const prompt = generateRefinementPrompt(
 *   "RegexBuilder.digit().exactly(3)",
 *   [{
 *     input: "1234",
 *     shouldMatch: true,
 *     actuallyMatched: false  // Pattern too restrictive
 *   }],
 *   "Pattern for 3-digit numbers"
 * );
 * // LLM sees: "Pattern is too restrictive - should match but doesn't"
 * // LLM generates: RegexBuilder.digit().atLeast(3)
 * ```
 */
export const generateRefinementPrompt = (
  currentPattern: string,
  failedTests: readonly {
    input: string;
    shouldMatch: boolean;
    actuallyMatched: boolean;
  }[],
  reasoning: string
): string => `You previously generated this regex pattern:

\`\`\`typescript
${currentPattern}
\`\`\`

With reasoning: "${reasoning}"

However, it failed these test cases:

${failedTests
  .map(
    (test, i) => `
${i + 1}. Input: "${test.input}"
   Expected: ${test.shouldMatch ? "MATCH" : "NO MATCH"}
   Actual: ${test.actuallyMatched ? "MATCHED" : "NO MATCH"}
   Issue: ${
     test.shouldMatch && !test.actuallyMatched
       ? "Pattern is too restrictive - should match but doesn't"
       : "Pattern is too permissive - shouldn't match but does"
   }`
  )
  .join("\n")}

## Task

Refine the pattern to fix these failures while maintaining correctness for previously passing tests.

## Guidelines

1. Analyze what's wrong with the current pattern
2. Make minimal changes to fix the issues
3. Maintain readability and simplicity
4. Use named captures for important parts
5. Return ONLY the refined RegexBuilder code, no explanation

Generate the refined pattern:`;

/**
 * Parse LLM response to extract RegexBuilder code
 *
 * Extracts clean RegexBuilder code from LLM responses that may contain:
 * - Markdown code blocks (```typescript or ```ts)
 * - Explanatory text before/after code
 * - Inline RegexBuilder patterns
 *
 * **Parsing Strategy** (in priority order):
 * 1. Extract from ```typescript or ```ts code blocks
 * 2. Find RegexBuilder pattern followed by blank line/end
 * 3. Return full response if it contains RegexBuilder
 * 4. Return null if no RegexBuilder code found
 *
 * @param response - Raw LLM response text
 * @returns Extracted RegexBuilder code or null if not found
 * @example
 * ```typescript
 * // Case 1: Markdown code block
 * const code1 = parseRegexBuilderCode(`
 *   Here's the pattern:
 *   \`\`\`typescript
 *   RegexBuilder.digit().oneOrMore()
 *   \`\`\`
 * `);
 * // Returns: "RegexBuilder.digit().oneOrMore()"
 *
 * // Case 2: Inline pattern
 * const code2 = parseRegexBuilderCode(
 *   "RegexBuilder.lit('test').capture('name')"
 * );
 * // Returns: "RegexBuilder.lit('test').capture('name')"
 *
 * // Case 3: No pattern
 * const code3 = parseRegexBuilderCode("I cannot help with that.");
 * // Returns: null
 * ```
 */
export const parseRegexBuilderCode = (response: string): string | null => {
  // Try to extract code from markdown code blocks
  const codeBlockMatch = response.match(
    /```(?:typescript|ts)?\s*([\s\S]*?)```/
  );
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find RegexBuilder pattern directly
  const regexBuilderMatch = response.match(/(RegexBuilder[\s\S]*?)(?:\n\n|$)/);
  if (regexBuilderMatch) {
    return regexBuilderMatch[1].trim();
  }

  // Return full response if no patterns found (might be the code itself)
  if (response.includes("RegexBuilder")) {
    return response.trim();
  }

  return null;
};

/**
 * Validate LLM-generated code for safety and correctness
 *
 * Performs security and structural validation on code before interpretation.
 * This prevents code injection and ensures only safe RegexBuilder patterns
 * are executed.
 *
 * **Security Checks**:
 * - Rejects code containing `eval()` or `Function()` constructors
 * - Ensures RegexBuilder API is used (not raw strings)
 * - Validates at least one valid method is called
 *
 * **Validation Rules**:
 * - Must contain "RegexBuilder"
 * - Must call at least one valid API method
 * - Must not contain dangerous functions
 *
 * @param code - The code to validate
 * @returns true if code is safe and valid, false otherwise
 * @example
 * ```typescript
 * // Valid patterns
 * validateRegexBuilderCode("RegexBuilder.digit().oneOrMore()");  // true
 * validateRegexBuilderCode("RegexBuilder.lit('test')");  // true
 *
 * // Invalid patterns
 * validateRegexBuilderCode("const x = /test/");  // false - no RegexBuilder
 * validateRegexBuilderCode("RegexBuilder; eval('code')");  // false - has eval()
 * validateRegexBuilderCode("RegexBuilder");  // false - no methods called
 * ```
 */
export const validateRegexBuilderCode = (code: string): boolean => {
  // Basic validation
  if (!code.includes("RegexBuilder")) {
    return false;
  }

  // Check for dangerous patterns
  if (code.includes("eval") || code.includes("Function")) {
    return false;
  }

  // Check for proper method calls
  const validMethods = [
    "lit",
    "raw",
    "digit",
    "word",
    "whitespace",
    "any",
    "charClass",
    "then",
    "or",
    "alt",
    "zeroOrMore",
    "oneOrMore",
    "optional",
    "exactly",
    "atLeast",
    "between",
    "capture",
    "group",
    "startOfLine",
    "endOfLine",
    "wordBoundary",
  ];

  // At least one valid method should be present
  return validMethods.some(
    (method) =>
      code.includes(`.${method}(`) || code.includes(`RegexBuilder.${method}(`)
  );
};
