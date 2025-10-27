import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  callLLM,
  callLLMWithRetry,
  type LLMConfig,
  LLMConfigError,
  LLMError,
  LLMRateLimitError,
} from "../src/ai/llm-client.js";

describe("LLM Client - Extended Coverage", () => {
  describe("Provider Handling", () => {
    it("should fail with LLMConfigError for unknown provider", async () => {
      const config: Partial<LLMConfig> = {
        provider: "unknown" as any,
      };

      const result = await Effect.runPromise(
        Effect.either(callLLM("test prompt", config))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(LLMConfigError);
        expect(result.left.message).toContain("Unknown LLM provider");
        expect(result.left.message).toContain("unknown");
      }
    });

    it("should fail with LLMError for local provider (not implemented)", async () => {
      const config: Partial<LLMConfig> = {
        provider: "local",
      };

      const result = await Effect.runPromise(
        Effect.either(callLLM("test prompt", config))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(LLMError);
        expect(result.left.message).toContain("not yet implemented");
        expect(result.left.message).toContain("Local LLM provider");
      }
    });

    it("should fail with LLMError for openai provider (not implemented)", async () => {
      const config: Partial<LLMConfig> = {
        provider: "openai",
      };

      const result = await Effect.runPromise(
        Effect.either(callLLM("test prompt", config))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(LLMError);
        expect(result.left.message).toContain("not yet implemented");
        expect(result.left.message).toContain("OpenAI provider");
      }
    });
  });

  describe("Error Type Construction", () => {
    it("should create LLMError with message and cause", () => {
      const cause = new Error("Network error");
      const error = new LLMError("API call failed", cause);

      expect(error._tag).toBe("LLMError");
      expect(error.message).toBe("API call failed");
      expect(error.cause).toBe(cause);
    });

    it("should create LLMError without cause", () => {
      const error = new LLMError("API call failed");

      expect(error._tag).toBe("LLMError");
      expect(error.message).toBe("API call failed");
      expect(error.cause).toBeUndefined();
    });

    it("should create LLMConfigError with message", () => {
      const error = new LLMConfigError("Invalid configuration");

      expect(error._tag).toBe("LLMConfigError");
      expect(error.message).toBe("Invalid configuration");
    });

    it("should create LLMRateLimitError with retryAfter", () => {
      const error = new LLMRateLimitError(60);

      expect(error._tag).toBe("LLMRateLimitError");
      expect(error.retryAfter).toBe(60);
    });

    it("should create LLMRateLimitError without retryAfter", () => {
      const error = new LLMRateLimitError();

      expect(error._tag).toBe("LLMRateLimitError");
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe("Retry Logic - Config Errors", () => {
    it("should not retry LLMConfigError (missing API key)", async () => {
      // Save and remove API key
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const result = await Effect.runPromise(
        Effect.either(
          callLLMWithRetry(
            "test prompt",
            { provider: "anthropic" },
            3 // max retries
          )
        )
      );

      // Restore API key
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(LLMConfigError);
        expect(result.left.message).toContain("API key not found");
      }
    });

    it("should not retry LLMConfigError (none provider)", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          callLLMWithRetry(
            "test prompt",
            { provider: "none" },
            3 // max retries
          )
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(LLMConfigError);
        expect(result.left.message).toContain("'none'");
      }
    });

    it("should not retry LLMConfigError (unknown provider)", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          callLLMWithRetry(
            "test prompt",
            { provider: "invalid" as any },
            3 // max retries
          )
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(LLMConfigError);
      }
    });
  });

  describe("Configuration Merging", () => {
    it("should merge partial config with defaults", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          callLLM("test", {
            provider: "none",
            maxTokens: 100,
          })
        )
      );

      // Should still fail with 'none' provider
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.message).toContain("'none'");
      }
    });

    it("should use default config when no config provided", async () => {
      // Save and remove API key to ensure config error
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const result = await Effect.runPromise(Effect.either(callLLM("test")));

      // Restore API key
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        // Should use default provider (anthropic) and fail on missing key
        expect(result.left).toBeInstanceOf(LLMConfigError);
        expect(result.left.message).toContain("ANTHROPIC_API_KEY");
      }
    });
  });
});
