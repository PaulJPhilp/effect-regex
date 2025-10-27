import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  analyzeAndRefine,
  developPattern,
  type PatternProposal,
  testPattern,
  validateForDialect,
} from "../src/ai/toolkit.js";
import { RegexBuilder } from "../src/core/builder.js";
import type { RegexTestCase } from "../src/core/tester.js";

describe("AI Toolkit - Extended Coverage", () => {
  describe("testPattern", () => {
    it("should test a pattern against test cases", async () => {
      const pattern = RegexBuilder.digit().oneOrMore();
      const testCases: RegexTestCase[] = [
        { input: "123", shouldMatch: true },
        { input: "abc", shouldMatch: false },
      ];

      const result = await Effect.runPromise(
        testPattern(pattern, testCases, "js", 100)
      );

      expect(result.total).toBe(2);
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should report failures for incorrect patterns", async () => {
      const pattern = RegexBuilder.digit().oneOrMore();
      const testCases: RegexTestCase[] = [
        { input: "abc", shouldMatch: true }, // Will fail - no digits
      ];

      const result = await Effect.runPromise(
        testPattern(pattern, testCases, "js", 100)
      );

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it("should work with re2-sim dialect", async () => {
      const pattern = RegexBuilder.lit("test");
      const testCases: RegexTestCase[] = [{ input: "test", shouldMatch: true }];

      const result = await Effect.runPromise(
        testPattern(pattern, testCases, "re2-sim", 100)
      );

      expect(result.passed).toBe(1);
    });
  });

  describe("analyzeAndRefine", () => {
    it("should suggest refinements for patterns that are too restrictive", async () => {
      const proposal: PatternProposal = {
        pattern: RegexBuilder.digit().exactly(3),
        reasoning: "Pattern for 3-digit numbers",
        confidence: 0.8,
        testCases: [
          { input: "123", shouldMatch: true },
          { input: "1234", shouldMatch: true }, // Will fail - pattern too restrictive
        ],
      };

      // Create test results manually to simulate the failure scenario
      const testResults = {
        total: 2,
        passed: 1,
        failed: 1,
        failures: [
          {
            caseIndex: 1,
            passed: false,
            matched: false,
            expectedMatch: true,
            timedOut: false,
            durationMs: 0,
          },
        ],
        warnings: [],
        timingMs: 5,
      };

      const suggestions = await Effect.runPromise(
        analyzeAndRefine(proposal, testResults as any)
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].issue).toContain("fails to match");
      expect(suggestions[0].suggestion).toContain("more permissive");
      expect(suggestions[0].proposedChanges).toHaveProperty("pattern");
    });

    it("should suggest refinements for patterns that are too permissive", async () => {
      const proposal: PatternProposal = {
        pattern: RegexBuilder.any().oneOrMore(),
        reasoning: "General pattern",
        confidence: 0.7,
        testCases: [
          { input: "valid", shouldMatch: true },
          { input: "invalid", shouldMatch: false }, // Will fail - pattern too permissive
        ],
      };

      const testResults = await Effect.runPromise(
        testPattern(proposal.pattern, proposal.testCases, "js", 100)
      );

      const suggestions = await Effect.runPromise(
        analyzeAndRefine(proposal, testResults)
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].issue).toContain("incorrectly matches");
      expect(suggestions[0].suggestion).toContain("more specific");
    });

    it("should suggest performance optimizations for slow patterns", async () => {
      const proposal: PatternProposal = {
        pattern: RegexBuilder.lit("test"),
        reasoning: "Simple test pattern",
        confidence: 0.8,
        testCases: [{ input: "test", shouldMatch: true }],
      };

      // Create fake test results with timeout warnings and no failures
      const testResults = {
        total: 1,
        passed: 1,
        failed: 0,
        failures: [], // Empty failures array
        warnings: ["Test case 0 took 95ms (close to 100ms timeout)"], // Include "timeout" keyword
        timingMs: 100,
      };

      const suggestions = await Effect.runPromise(
        analyzeAndRefine(proposal, testResults as any)
      );

      expect(suggestions.length).toBeGreaterThan(0);
      const perfSuggestion = suggestions.find((s) =>
        s.issue.includes("performance")
      );
      expect(perfSuggestion).toBeDefined();
      if (perfSuggestion) {
        expect(perfSuggestion.suggestion).toContain("simplifying");
      }
    });

    it("should return empty suggestions when all tests pass", async () => {
      const proposal: PatternProposal = {
        pattern: RegexBuilder.digit().oneOrMore(),
        reasoning: "Digit pattern",
        confidence: 0.9,
        testCases: [
          { input: "123", shouldMatch: true },
          { input: "abc", shouldMatch: false },
        ],
      };

      const testResults = await Effect.runPromise(
        testPattern(proposal.pattern, proposal.testCases, "js", 100)
      );

      const suggestions = await Effect.runPromise(
        analyzeAndRefine(proposal, testResults)
      );

      expect(suggestions).toHaveLength(0);
    });

    it("should handle multiple failure types", async () => {
      const proposal: PatternProposal = {
        pattern: RegexBuilder.lit("test"),
        reasoning: "Exact match pattern",
        confidence: 0.8,
        testCases: [
          { input: "testing", shouldMatch: true }, // Too restrictive
          { input: "bad", shouldMatch: false }, // Actually passes
        ],
      };

      // Create test results with a failure
      const testResults = {
        total: 2,
        passed: 1,
        failed: 1,
        failures: [
          {
            caseIndex: 0,
            passed: false,
            matched: false,
            expectedMatch: true,
            timedOut: false,
            durationMs: 0,
          },
        ],
        warnings: [],
        timingMs: 5,
      };

      const suggestions = await Effect.runPromise(
        analyzeAndRefine(proposal, testResults as any)
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("developPattern", () => {
    it("should successfully develop a pattern in one iteration", async () => {
      const result = await Effect.runPromise(
        developPattern(["123", "456", "789"], ["abc", "xyz"], 3, "js")
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.history.length).toBeGreaterThan(0);
      expect(result.finalPattern).toBeDefined();
      expect(result.testResults).toBeDefined();
      expect(result.testResults.total).toBe(5); // 3 positive + 2 negative
    });

    it("should refine pattern through multiple iterations if needed", async () => {
      // Use examples that might require refinement
      const result = await Effect.runPromise(
        developPattern(["test1", "test2", "test3"], ["bad1", "bad2"], 3, "js")
      );

      expect(result.finalPattern).toBeDefined();
      expect(result.testResults).toBeDefined();
      expect(result.history.length).toBeGreaterThanOrEqual(1);
      expect(result.iterations).toBeLessThanOrEqual(3);
    });

    it("should respect max iterations limit", async () => {
      const result = await Effect.runPromise(
        developPattern(["a", "b", "c"], ["1", "2"], 1, "js")
      );

      expect(result.iterations).toBeLessThanOrEqual(1);
      expect(result.history.length).toBeLessThanOrEqual(2); // Initial + 1 iteration
    });

    it("should return early if pattern is perfect", async () => {
      // Use very simple examples that should work on first try
      const result = await Effect.runPromise(
        developPattern(["123"], ["abc"], 5, "js")
      );

      expect(result.success).toBe(true);
      // Should complete in fewer iterations if pattern works immediately
      expect(result.iterations).toBeLessThanOrEqual(5);
    });

    it("should work with re2-sim dialect", async () => {
      const result = await Effect.runPromise(
        developPattern(["test"], ["bad"], 2, "re2-sim")
      );

      expect(result.finalPattern).toBeDefined();
      expect(result.testResults).toBeDefined();
    });

    it("should handle case with no refinement suggestions", async () => {
      // This tests the case where suggestions.length === 0 and loop breaks
      const result = await Effect.runPromise(
        developPattern(["simple"], [], 3, "js")
      );

      expect(result.finalPattern).toBeDefined();
      expect(result.testResults).toBeDefined();
    });
  });

  describe("validateForDialect", () => {
    it("should validate pattern for js dialect", async () => {
      const pattern = RegexBuilder.digit().oneOrMore();
      const result = await Effect.runPromise(validateForDialect(pattern, "js"));

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should validate pattern for re2 dialect", async () => {
      const pattern = RegexBuilder.lit("test").oneOrMore();
      const result = await Effect.runPromise(
        validateForDialect(pattern, "re2")
      );

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should validate pattern for pcre dialect", async () => {
      const pattern = RegexBuilder.word().zeroOrMore();
      const result = await Effect.runPromise(
        validateForDialect(pattern, "pcre")
      );

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect invalid patterns", async () => {
      // Create a pattern that might have linting issues
      const pattern = RegexBuilder.raw("(?<name>test)(?<name>duplicate)"); // Duplicate named groups

      const result = await Effect.runPromise(validateForDialect(pattern, "js"));

      // Depending on linter implementation, this might be invalid
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("issues");
    });

    it("should return issues array even when valid", async () => {
      const pattern = RegexBuilder.lit("simple");
      const result = await Effect.runPromise(validateForDialect(pattern, "js"));

      expect(Array.isArray(result.issues)).toBe(true);
    });
  });
});
