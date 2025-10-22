/**
 * Prompt engineering for LLM-based pattern generation
 */

/**
 * Generate a prompt for initial pattern proposal
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
 * Generate a prompt for pattern refinement
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
 * Validate that the LLM response is valid RegexBuilder code
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
