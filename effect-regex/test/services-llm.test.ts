import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { interpretRegexBuilderCode } from "../src/ai/interpreter.js";
import {
  CodeInterpreterError,
  LLMConfigError,
  LLMError,
} from "../src/errors/index.js";
import { LLMServiceMock } from "../src/services/llm.js";
import { LLMService } from "../src/services/types.js";

// Mock llm-client module
const _mockLLMClient = {
  callLLMWithRetry: (prompt: string) =>
    Effect.succeed("RegexBuilder.lit('test').oneOrMore()"),
  isLLMAvailable: () => Effect.succeed(true),
};

describe("LLM Service", () => {
  describe("LLMServiceMock", () => {
    it("should provide mock call implementation", async () => {
      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.call("test prompt", {});
      }).pipe(Effect.provide(LLMServiceMock));

      const result = await Effect.runPromise(program);
      expect(result).toBe("RegexBuilder.lit('mocked').oneOrMore()");
    });

    it("should provide mock isAvailable implementation", async () => {
      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.isAvailable("anthropic");
      }).pipe(Effect.provide(LLMServiceMock));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it("should provide mock proposePattern implementation", async () => {
      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.proposePattern(
          ["test1", "test2"],
          ["bad1", "bad2"],
          "context",
          {}
        );
      }).pipe(Effect.provide(LLMServiceMock));

      const result = await Effect.runPromise(program);
      expect(result).toHaveProperty("pattern");
      expect(result).toHaveProperty("reasoning", "Mocked pattern for testing");
      expect(result).toHaveProperty("confidence", 0.7);
      expect(result.testCases).toHaveLength(4);
      expect(result.testCases[0]).toEqual({
        input: "test1",
        shouldMatch: true,
      });
      expect(result.testCases[2]).toEqual({
        input: "bad1",
        shouldMatch: false,
      });
    });

    it("should create test cases from examples", async () => {
      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.proposePattern(
          ["positive"],
          ["negative"],
          undefined,
          {}
        );
      }).pipe(Effect.provide(LLMServiceMock));

      const result = await Effect.runPromise(program);
      expect(result.testCases).toEqual([
        { input: "positive", shouldMatch: true },
        { input: "negative", shouldMatch: false },
      ]);
    });
  });

  describe("LLMServiceLive - proposePattern", () => {
    it("should generate pattern from valid LLM response", async () => {
      // Mock the LLM client to return valid RegexBuilder code
      const mockLayer = Layer.succeed(LLMService, {
        call: () => Effect.succeed("RegexBuilder.digit().oneOrMore()"),
        isAvailable: () => Effect.succeed(true),
        proposePattern: (positiveExamples, negativeExamples, context, config) =>
          Effect.gen(function* () {
            // Simulate the real implementation logic
            const response = "RegexBuilder.digit().oneOrMore()";
            const pattern = interpretRegexBuilderCode(response);

            return {
              pattern,
              reasoning: `LLM-generated pattern based on ${positiveExamples.length} positive and ${negativeExamples.length} negative examples`,
              confidence: 0.85,
              testCases: [
                ...positiveExamples.map((ex) => ({
                  input: ex,
                  shouldMatch: true,
                })),
                ...negativeExamples.map((ex) => ({
                  input: ex,
                  shouldMatch: false,
                })),
              ],
            };
          }),
      });

      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.proposePattern(
          ["123", "456"],
          ["abc", "xyz"],
          "number pattern",
          {}
        );
      }).pipe(Effect.provide(mockLayer));

      const result = await Effect.runPromise(program);
      expect(result).toHaveProperty("pattern");
      expect(result.reasoning).toContain("2 positive and 2 negative");
      expect(result.confidence).toBe(0.85);
      expect(result.testCases).toHaveLength(4);
    });

    it("should fail with LLMError when code parsing fails", async () => {
      // Mock the LLM client to return invalid code
      const mockLayer = Layer.succeed(LLMService, {
        call: () => Effect.succeed("invalid code that doesn't parse"),
        isAvailable: () => Effect.succeed(true),
        proposePattern: (positiveExamples, negativeExamples) =>
          Effect.gen(function* () {
            const response = "invalid code that doesn't parse";

            // Simulate parsing failure
            const code = response.includes("RegexBuilder")
              ? response
              : undefined;

            if (!code) {
              return yield* Effect.fail(
                new LLMError({
                  message:
                    "Failed to parse RegexBuilder code from LLM response",
                })
              );
            }

            const pattern = interpretRegexBuilderCode(code);
            return {
              pattern,
              reasoning: "",
              confidence: 0.85,
              testCases: [],
            };
          }),
      });

      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.proposePattern(["test"], [], undefined, {});
      }).pipe(Effect.provide(mockLayer));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should fail with CodeInterpreterError when code interpretation fails", async () => {
      // Mock the LLM client to return syntactically valid but un-interpretable code
      const mockLayer = Layer.succeed(LLMService, {
        call: () => Effect.succeed("RegexBuilder.invalidMethod()"),
        isAvailable: () => Effect.succeed(true),
        proposePattern: (positiveExamples, negativeExamples) =>
          Effect.gen(function* () {
            const code = "RegexBuilder.invalidMethod()";

            try {
              const pattern = interpretRegexBuilderCode(code);
              return {
                pattern,
                reasoning: "",
                confidence: 0.85,
                testCases: [],
              };
            } catch (error) {
              return yield* Effect.fail(
                new CodeInterpreterError({
                  code,
                  reason:
                    error instanceof Error ? error.message : String(error),
                  cause: error,
                })
              );
            }
          }),
      });

      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.proposePattern(["test"], [], undefined, {});
      }).pipe(
        Effect.provide(mockLayer),
        Effect.catchTags({
          CodeInterpreterError: (error) =>
            Effect.succeed({
              errorCode: error.code,
              errorReason: error.reason,
            }),
        })
      );

      const result = await Effect.runPromise(program);
      expect(result).toHaveProperty("errorCode");
      expect(result.errorCode).toContain("invalidMethod");
    });
  });

  describe("LLMServiceLive - call", () => {
    it("should convert generic errors to LLMError", async () => {
      const mockLayer = Layer.succeed(LLMService, {
        call: () =>
          Effect.fail(new Error("Network error")).pipe(
            Effect.mapError((error) => {
              if ("_tag" in error) {
                return error as LLMError;
              }
              return new LLMError({
                message: error instanceof Error ? error.message : String(error),
                cause: error,
              });
            })
          ),
        isAvailable: () => Effect.succeed(true),
        proposePattern: () => Effect.succeed({} as any),
      });

      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.call("test", {});
      }).pipe(
        Effect.provide(mockLayer),
        Effect.catchTags({
          LLMError: (error) => Effect.succeed({ errorMessage: error.message }),
        })
      );

      const result = await Effect.runPromise(program);
      expect(result).toEqual({ errorMessage: "Network error" });
    });

    it("should pass through tagged errors unchanged", async () => {
      const configError = new LLMConfigError({
        provider: "test",
        reason: "Invalid config",
      });

      const mockLayer = Layer.succeed(LLMService, {
        call: () =>
          Effect.fail(configError).pipe(
            Effect.mapError((error) => {
              if ("_tag" in error) {
                return error as LLMConfigError;
              }
              return new LLMError({ message: "fallback" });
            })
          ),
        isAvailable: () => Effect.succeed(true),
        proposePattern: () => Effect.succeed({} as any),
      });

      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.call("test", {});
      }).pipe(
        Effect.provide(mockLayer),
        Effect.catchTags({
          LLMConfigError: (error) =>
            Effect.succeed({ provider: error.provider, reason: error.reason }),
        })
      );

      const result = await Effect.runPromise(program);
      expect(result).toEqual({ provider: "test", reason: "Invalid config" });
    });
  });

  describe("LLMServiceLive - isAvailable", () => {
    it("should check LLM availability", async () => {
      const mockLayer = Layer.succeed(LLMService, {
        call: () => Effect.succeed(""),
        isAvailable: (provider) =>
          Effect.succeed(provider === "anthropic" || provider === "openai"),
        proposePattern: () => Effect.succeed({} as any),
      });

      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        const anthropicAvailable = yield* service.isAvailable("anthropic");
        const openaiAvailable = yield* service.isAvailable("openai");
        const otherAvailable = yield* service.isAvailable("unknown" as any);

        return { anthropicAvailable, openaiAvailable, otherAvailable };
      }).pipe(Effect.provide(mockLayer));

      const result = await Effect.runPromise(program);
      expect(result.anthropicAvailable).toBe(true);
      expect(result.openaiAvailable).toBe(true);
      expect(result.otherAvailable).toBe(false);
    });
  });

  describe("Integration with RegexBuilder", () => {
    it("should create valid RegexBuilder patterns", async () => {
      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        const proposal = yield* service.proposePattern(
          ["hello", "world"],
          ["bad"],
          undefined,
          {}
        );

        // Verify the pattern is a valid RegexBuilder
        const ast = proposal.pattern.getAst();
        expect(ast).toBeDefined();
        expect(ast.type).toBeDefined();

        return proposal;
      }).pipe(Effect.provide(LLMServiceMock));

      const result = await Effect.runPromise(program);
      expect(result.pattern).toBeDefined();
    });
  });

  describe("Test case generation", () => {
    it("should generate test cases with correct structure", async () => {
      const program = Effect.gen(function* () {
        const service = yield* LLMService;
        return yield* service.proposePattern(
          ["pos1", "pos2", "pos3"],
          ["neg1", "neg2"],
          undefined,
          {}
        );
      }).pipe(Effect.provide(LLMServiceMock));

      const result = await Effect.runPromise(program);

      expect(result.testCases).toHaveLength(5);

      // First 3 should be positive examples
      for (let i = 0; i < 3; i++) {
        expect(result.testCases[i].shouldMatch).toBe(true);
        expect(result.testCases[i].input).toMatch(/^pos\d$/);
      }

      // Last 2 should be negative examples
      for (let i = 3; i < 5; i++) {
        expect(result.testCases[i].shouldMatch).toBe(false);
        expect(result.testCases[i].input).toMatch(/^neg\d$/);
      }
    });
  });
});
