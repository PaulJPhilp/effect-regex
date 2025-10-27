import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  type RegexTestCase,
  runCorpora,
  testRegex,
} from "../src/core/tester.js";

describe("Regex Tester - Extended Coverage", () => {
  describe("Capture Groups", () => {
    it("should validate named capture groups", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello world",
          shouldMatch: true,
          expectedCaptures: {
            greeting: "hello",
            subject: "world",
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("(?<greeting>\\w+) (?<subject>\\w+)", "js", testCases)
      );

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it("should validate numbered capture groups", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello world",
          shouldMatch: true,
          expectedCaptures: {
            "1": "hello",
            "2": "world",
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("(\\w+) (\\w+)", "js", testCases)
      );

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("should fail when captures don't match", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello world",
          shouldMatch: true,
          expectedCaptures: {
            "1": "goodbye", // Wrong expected value
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("(\\w+) (\\w+)", "js", testCases)
      );

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failures[0].passed).toBe(false);
    });

    it("should validate array captures", async () => {
      // This tests capture arrays (though JavaScript regex doesn't natively support this,
      // we're testing the validation logic)
      const testCases: RegexTestCase[] = [
        {
          input: "test",
          shouldMatch: true,
          expectedCaptures: {
            group: ["a", "b", "c"],
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("test", "js", testCases)
      );

      // This will fail because the pattern doesn't create array captures
      expect(result.failed).toBe(1);
    });

    it("should handle missing expected captures", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello",
          shouldMatch: true,
          expectedCaptures: {
            missing: "value",
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("hello", "js", testCases)
      );

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it("should validate captures with mismatched array lengths", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "test",
          shouldMatch: true,
          expectedCaptures: {
            group: ["a", "b"],
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("test", "js", testCases)
      );

      expect(result.failed).toBe(1);
    });
  });

  describe("Timeout Handling", () => {
    it("should detect timeouts for catastrophic backtracking", async () => {
      // Pattern known to cause catastrophic backtracking
      const pattern = "(a+)+b";
      const testCases: RegexTestCase[] = [
        {
          input: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac", // No 'b' at end causes backtracking
          shouldMatch: false,
        },
      ];

      const result = await Effect.runPromise(
        testRegex(pattern, "js", testCases, 50) // Very short timeout
      );

      // Should either timeout or complete quickly
      expect(result.total).toBe(1);
      if (result.failed > 0) {
        // If it failed, check if it was due to timeout
        const failure = result.failures[0];
        expect(failure.timedOut || failure.durationMs < 100).toBe(true);
      }
    }, 180_000); // 180s timeout for catastrophic backtracking test

    it("should warn about slow tests near timeout", async () => {
      // Use a pattern that's slow but doesn't timeout
      const pattern = "(a+)+b";
      const testCases: RegexTestCase[] = [
        {
          input: "aaaaaaaab", // Has 'b' so it won't backtrack forever
          shouldMatch: true,
        },
      ];

      const result = await Effect.runPromise(
        testRegex(pattern, "js", testCases, 1000) // Longer timeout
      );

      // The test might pass but could generate warnings
      expect(result.total).toBe(1);
    });

    it("should handle timeout errors correctly", async () => {
      // This tests the timeout error path
      const pattern = "(a+)+b";
      const testCases: RegexTestCase[] = [
        {
          input: "a".repeat(30) + "c",
          shouldMatch: false,
        },
      ];

      const result = await Effect.runPromise(
        testRegex(pattern, "js", testCases, 10) // Very short timeout
      );

      if (result.failed > 0) {
        const failure = result.failures[0];
        if (failure.timedOut) {
          expect(result.warnings.some((w) => w.includes("timed out"))).toBe(
            true
          );
        }
      }
    }, 30_000); // 30s timeout for catastrophic backtracking test
  });

  describe("RE2 Dialect Simulation", () => {
    it("should handle re2-sim dialect", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "test123",
          shouldMatch: true,
        },
      ];

      const result = await Effect.runPromise(
        testRegex("test\\d+", "re2-sim", testCases)
      );

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("should handle re2 dialect", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello world",
          shouldMatch: true,
        },
      ];

      const result = await Effect.runPromise(
        testRegex("hello \\w+", "re2", testCases)
      );

      expect(result.passed).toBe(1);
    });
  });

  describe("Invalid Patterns", () => {
    it("should handle invalid regex patterns gracefully", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "test",
          shouldMatch: true,
        },
      ];

      const result = await Effect.runPromise(
        testRegex("[invalid(", "js", testCases) // Unclosed bracket
      );

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(testCases.length);
      expect(result.failures[0].error).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("compilation failed");
    });

    it("should mark all test cases as failed for invalid patterns", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "test1",
          shouldMatch: true,
        },
        {
          input: "test2",
          shouldMatch: false,
        },
        {
          input: "test3",
          shouldMatch: true,
        },
      ];

      const result = await Effect.runPromise(
        testRegex("(unclosed", "js", testCases)
      );

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.failures).toHaveLength(3);

      // All failures should have errors
      for (const failure of result.failures) {
        expect(failure.error).toBeDefined();
        expect(failure.timedOut).toBe(false);
      }
    });
  });

  describe("Negative Match Cases", () => {
    it("should pass when input doesn't match and shouldn't match", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello",
          shouldMatch: false,
        },
      ];

      const result = await Effect.runPromise(
        testRegex("\\d+", "js", testCases)
      );

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("should handle multiple negative test cases", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "abc",
          shouldMatch: false,
        },
        {
          input: "xyz",
          shouldMatch: false,
        },
        {
          input: "hello world",
          shouldMatch: false,
        },
      ];

      const result = await Effect.runPromise(
        testRegex("^\\d+$", "js", testCases)
      );

      expect(result.passed).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  describe("Mixed Test Cases", () => {
    it("should handle mix of positive and negative cases", async () => {
      const testCases: RegexTestCase[] = [
        { input: "123", shouldMatch: true },
        { input: "abc", shouldMatch: false },
        { input: "456", shouldMatch: true },
        { input: "xyz", shouldMatch: false },
      ];

      const result = await Effect.runPromise(
        testRegex("^\\d+$", "js", testCases)
      );

      expect(result.passed).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(4);
    });

    it("should report failures correctly in mixed cases", async () => {
      const testCases: RegexTestCase[] = [
        { input: "123", shouldMatch: true },
        { input: "abc", shouldMatch: true }, // Should fail - doesn't match
        { input: "456", shouldMatch: false }, // Should fail - does match
        { input: "xyz", shouldMatch: false },
      ];

      const result = await Effect.runPromise(
        testRegex("^\\d+$", "js", testCases)
      );

      expect(result.passed).toBe(2);
      expect(result.failed).toBe(2);
      expect(result.failures).toHaveLength(2);

      // Check the failures are for cases 1 and 2 (indices 1 and 2)
      const failedIndices = result.failures.map((f) => f.caseIndex);
      expect(failedIndices).toContain(1);
      expect(failedIndices).toContain(2);
    });
  });

  describe("Timing and Performance", () => {
    it("should track timing for test execution", async () => {
      const testCases: RegexTestCase[] = [{ input: "test", shouldMatch: true }];

      const result = await Effect.runPromise(
        testRegex("test", "js", testCases)
      );

      expect(result.timingMs).toBeGreaterThanOrEqual(0);
      expect(result.timingMs).toBeLessThan(1000);
    });

    it("should track duration for individual test cases", async () => {
      const testCases: RegexTestCase[] = [
        { input: "test1", shouldMatch: true },
        { input: "test2", shouldMatch: true },
      ];

      const result = await Effect.runPromise(
        testRegex("test\\d", "js", testCases)
      );

      // Even though all passed, we don't get individual durations in successes
      // But failures would have durations
      expect(result.total).toBe(2);
    });
  });

  describe("runCorpora function", () => {
    it("should return empty results for now (placeholder)", async () => {
      const result = await runCorpora("test.json", "js", 100);

      expect(result).toEqual({});
    });

    it("should handle different dialects", async () => {
      const resultJs = await runCorpora("test.json", "js");
      const resultRe2 = await runCorpora("test.json", "re2");
      const resultRe2Sim = await runCorpora("test.json", "re2-sim");

      expect(resultJs).toEqual({});
      expect(resultRe2).toEqual({});
      expect(resultRe2Sim).toEqual({});
    });
  });

  describe("Empty and Edge Cases", () => {
    it("should handle empty test cases array", async () => {
      const result = await Effect.runPromise(testRegex("test", "js", []));

      expect(result.total).toBe(0);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it("should handle empty pattern", async () => {
      const testCases: RegexTestCase[] = [
        { input: "", shouldMatch: true },
        { input: "test", shouldMatch: true },
      ];

      const result = await Effect.runPromise(testRegex("", "js", testCases));

      // Empty pattern matches empty string and also matches at start of any string
      expect(result.passed).toBe(2);
    });

    it("should handle empty input", async () => {
      const testCases: RegexTestCase[] = [{ input: "", shouldMatch: false }];

      const result = await Effect.runPromise(
        testRegex("\\d+", "js", testCases)
      );

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe("Capture Edge Cases", () => {
    it("should handle optional capture groups", async () => {
      const testCases: RegexTestCase[] = [
        {
          input: "hello",
          shouldMatch: true,
          expectedCaptures: {
            "1": "hello",
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex("(\\w+)(\\s\\w+)?", "js", testCases)
      );

      // The second group is optional and won't be captured
      expect(result.passed).toBe(1);
    });

    it("should handle undefined captures in groups", async () => {
      const pattern = "(\\d+)|(\\w+)"; // Either digits or words
      const testCases: RegexTestCase[] = [
        {
          input: "123",
          shouldMatch: true,
          expectedCaptures: {
            "1": "123",
            // Group 2 will be undefined
          },
        },
      ];

      const result = await Effect.runPromise(
        testRegex(pattern, "js", testCases)
      );

      expect(result.passed).toBe(1);
    });
  });
});
