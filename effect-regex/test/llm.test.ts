/**
 * LLM Integration Tests
 * Tests for AI-powered pattern generation using Anthropic Claude API
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
  callLLM,
  callLLMWithRetry,
  isLLMAvailable,
  type LLMConfig,
  LLMConfigError,
  LLMError,
} from "../src/ai/llm-client.js";
import {
  proposePattern,
  proposePatternHeuristic,
  proposePatternWithLLM,
} from "../src/ai/toolkit.js";
import { emit } from "../src/core/builder.js";

describe("LLM Client", () => {
  it("should check if LLM is available", async () => {
    const result = await Effect.runPromise(isLLMAvailable("anthropic"));

    // Result depends on whether ANTHROPIC_API_KEY is set
    expect(typeof result).toBe("boolean");
  });

  it("should fail with LLMConfigError when provider is 'none'", async () => {
    const config: Partial<LLMConfig> = { provider: "none" };

    const result = await Effect.runPromise(
      Effect.either(callLLM("test prompt", config))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(LLMConfigError);
      expect(result.left.message).toContain("'none'");
    }
  });

  it("should fail with LLMConfigError when API key is missing", async () => {
    // Save original env
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await Effect.runPromise(
      Effect.either(callLLM("test prompt", { provider: "anthropic" }))
    );

    // Restore env
    if (originalKey) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(LLMConfigError);
      expect(result.left.message).toContain("API key not found");
    }
  });

  it("should fail gracefully for unsupported providers", async () => {
    const result = await Effect.runPromise(
      Effect.either(callLLM("test prompt", { provider: "openai" }))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(LLMError);
      expect(result.left.message).toContain("not yet implemented");
    }
  });
});

describe("Heuristic Pattern Generation", () => {
  it("should propose pattern for quoted strings", async () => {
    const result = await Effect.runPromise(
      proposePatternHeuristic(
        ['"hello"', '"world"', '"test 123"'],
        ["hello", "world"],
        "quoted strings"
      )
    );

    expect(result).toHaveProperty("pattern");
    expect(result).toHaveProperty("reasoning");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("testCases");

    expect(result.reasoning).toContain("quoted");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.testCases.length).toBe(5); // 3 positive + 2 negative
  });

  it("should propose pattern for integers", async () => {
    const result = await Effect.runPromise(
      proposePatternHeuristic(
        ["123", "456", "789"],
        ["12.34", "abc"],
        "integers"
      )
    );

    expect(result.reasoning).toContain("numeric");
    expect(result.confidence).toBeGreaterThan(0);

    // Verify pattern matches integers
    const emitted = emit(result.pattern);
    const regex = new RegExp(emitted.pattern);
    expect(regex.test("123")).toBe(true);
    expect(regex.test("abc")).toBe(false);
  });

  it("should propose pattern for paths", async () => {
    const result = await Effect.runPromise(
      proposePatternHeuristic(
        ["/usr/bin/node", "/home/user/file.txt"],
        ["hello", "123"],
        "file paths"
      )
    );

    expect(result.reasoning).toContain("path");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should default to word pattern for generic text", async () => {
    const result = await Effect.runPromise(
      proposePatternHeuristic(
        ["hello", "world", "test"],
        ["123", "456"],
        "words"
      )
    );

    expect(result.reasoning).toContain("word");
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("Smart Pattern Proposal", () => {
  it("should fall back to heuristics when LLM unavailable", async () => {
    // Save original env
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await Effect.runPromise(
      proposePattern(["hello", "world"], ["123", "456"], "words")
    );

    // Restore env
    if (originalKey) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }

    // Should still get a result (from heuristics)
    expect(result).toHaveProperty("pattern");
    expect(result).toHaveProperty("reasoning");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should generate test cases from examples", async () => {
    const positiveExamples = ["test1", "test2"];
    const negativeExamples = ["bad1", "bad2"];

    const result = await Effect.runPromise(
      proposePattern(positiveExamples, negativeExamples, "test patterns")
    );

    expect(result.testCases.length).toBe(4); // 2 + 2

    // Check positive test cases
    const positiveTests = result.testCases.filter((tc) => tc.shouldMatch);
    expect(positiveTests.length).toBe(2);
    expect(positiveTests.map((tc) => tc.input)).toEqual(positiveExamples);

    // Check negative test cases
    const negativeTests = result.testCases.filter((tc) => !tc.shouldMatch);
    expect(negativeTests.length).toBe(2);
    expect(negativeTests.map((tc) => tc.input)).toEqual(negativeExamples);
  });
});

// Note: Tests that actually call the Anthropic API are skipped by default
// to avoid API costs and rate limits. To run them, set ANTHROPIC_API_KEY
// and change describe.skip to describe.

describe.skip("LLM Pattern Generation (requires API key)", () => {
  it("should generate pattern from examples using LLM", async () => {
    const result = await Effect.runPromise(
      proposePatternWithLLM(
        ["user@example.com", "test@test.org", "foo@bar.co.uk"],
        ["@example.com", "not-email", "user@"],
        "email addresses"
      )
    );

    expect(result).toHaveProperty("pattern");
    expect(result).toHaveProperty("reasoning");
    expect(result).toHaveProperty("confidence");
    expect(result.confidence).toBeGreaterThan(0.8);

    // Test the generated pattern
    const emitted = emit(result.pattern);
    const regex = new RegExp(emitted.pattern);

    expect(regex.test("user@example.com")).toBe(true);
    expect(regex.test("not-email")).toBe(false);
  });

  it("should use LLM when API key is available", async () => {
    const result = await Effect.runPromise(
      proposePattern(
        ["192.168.1.1", "10.0.0.1"],
        ["256.1.1.1", "abc.def.ghi.jkl"],
        "IPv4 addresses"
      )
    );

    expect(result).toHaveProperty("pattern");
    expect(result.reasoning).toBeTruthy();

    // If LLM was used, confidence should be higher
    if (result.reasoning.includes("LLM")) {
      expect(result.confidence).toBeGreaterThan(0.8);
    }
  });

  it("should retry on transient errors", async () => {
    const result = await Effect.runPromise(
      Effect.either(
        callLLMWithRetry(
          "Generate a regex for matching email addresses",
          {
            provider: "anthropic",
          },
          2
        )
      )
    );

    // Should either succeed or fail with proper error handling
    if (result._tag === "Right") {
      expect(typeof result.right).toBe("string");
      expect(result.right.length).toBeGreaterThan(0);
    } else {
      // If it failed, should be a proper error
      expect(
        result.left instanceof LLMError || result.left instanceof LLMConfigError
      ).toBe(true);
    }
  });
});
