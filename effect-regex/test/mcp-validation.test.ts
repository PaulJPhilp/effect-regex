/**
 * Unit tests for MCP validation utilities
 *
 * Tests validation functions for input constraints and error handling.
 */

import { describe, expect, it } from "@effect/vitest";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { LIMITS } from "../src/mcp/types.js";
import {
  toMcpError,
  validateContext,
  validateDialect,
  validateExamples,
  validateInputEffect,
  validatePattern,
  validateTimeout,
} from "../src/mcp/utils/validation.js";

describe("MCP Validation Utilities", () => {
  describe("validateInputEffect", () => {
    it("should accept valid input", () =>
      Effect.gen(function* () {
        const result = yield* validateInputEffect({ pattern: "[a-z]+" });
        expect(result).toBeUndefined();
      }));

    it("should reject pattern exceeding max length", () =>
      Effect.gen(function* () {
        const longPattern = "x".repeat(LIMITS.MAX_PATTERN_LENGTH + 1);
        const result = yield* Effect.either(validateInputEffect(longPattern));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.code).toBe(ErrorCode.InvalidParams);
          expect(result.left.message).toContain("Pattern too long");
        }
      }));

    it("should reject too many test cases", () =>
      Effect.gen(function* () {
        const cases = new Array(LIMITS.MAX_TEST_CASES + 1).fill({ input: "x" });
        const result = yield* Effect.either(validateInputEffect({ cases }));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain("Too many test cases");
        }
      }));

    it("should accept exactly max test cases", () =>
      Effect.gen(function* () {
        const cases = new Array(LIMITS.MAX_TEST_CASES).fill({ input: "x" });
        const result = yield* validateInputEffect({ cases });
        expect(result).toBeUndefined();
      }));
  });

  describe("validatePattern", () => {
    it("should accept valid pattern", () =>
      Effect.gen(function* () {
        const result = yield* validatePattern("[a-z]+");
        expect(result).toBeUndefined();
      }));

    it("should reject pattern exceeding max length", () =>
      Effect.gen(function* () {
        const longPattern = "x".repeat(LIMITS.MAX_PATTERN_LENGTH + 1);
        const result = yield* Effect.either(validatePattern(longPattern));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain("Pattern too long");
        }
      }));

    it("should reject invalid regex syntax", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(validatePattern("[invalid(regex"));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain("Invalid regex pattern");
        }
      }));

    it("should accept complex valid patterns", () =>
      Effect.gen(function* () {
        const result = yield* validatePattern(
          "(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,})"
        );
        expect(result).toBeUndefined();
      }));

    it("should accept empty pattern", () =>
      Effect.gen(function* () {
        const result = yield* validatePattern("");
        expect(result).toBeUndefined();
      }));
  });

  describe("validateExamples", () => {
    it("should accept valid examples", () =>
      Effect.gen(function* () {
        const result = yield* validateExamples(["hello", "world"], ["123"]);
        expect(result).toBeUndefined();
      }));

    it("should reject empty positive examples", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(validateExamples([], []));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain(
            "At least one positive example"
          );
        }
      }));

    it("should reject too many positive examples", () =>
      Effect.gen(function* () {
        const tooMany = new Array(LIMITS.MAX_POSITIVE_EXAMPLES + 1).fill("x");
        const result = yield* Effect.either(validateExamples(tooMany, []));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toContain("Too many positive examples");
        }
      }));

    it("should reject too many negative examples", () =>
      Effect.gen(function* () {
        const tooMany = new Array(LIMITS.MAX_NEGATIVE_EXAMPLES + 1).fill("x");
        const result = yield* Effect.either(
          validateExamples(["valid"], tooMany)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toContain("Too many negative examples");
        }
      }));

    it("should reject empty string examples", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          validateExamples(["valid", ""], [])
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toContain("cannot be empty strings");
        }
      }));

    it("should accept exactly max positive examples", () =>
      Effect.gen(function* () {
        const max = new Array(LIMITS.MAX_POSITIVE_EXAMPLES).fill("x");
        const result = yield* validateExamples(max, []);
        expect(result).toBeUndefined();
      }));

    it("should accept exactly max negative examples", () =>
      Effect.gen(function* () {
        const max = new Array(LIMITS.MAX_NEGATIVE_EXAMPLES).fill("y");
        const result = yield* validateExamples(["x"], max);
        expect(result).toBeUndefined();
      }));
  });

  describe("validateContext", () => {
    it("should accept valid context", () =>
      Effect.gen(function* () {
        const result = yield* validateContext("Pattern for email addresses");
        expect(result).toBeUndefined();
      }));

    it("should accept undefined context", () =>
      Effect.gen(function* () {
        const result = yield* validateContext(undefined);
        expect(result).toBeUndefined();
      }));

    it("should reject context exceeding max length", () =>
      Effect.gen(function* () {
        const longContext = "x".repeat(LIMITS.MAX_CONTEXT_LENGTH + 1);
        const result = yield* Effect.either(validateContext(longContext));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain("Context too long");
        }
      }));

    it("should accept exactly max context length", () =>
      Effect.gen(function* () {
        const maxContext = "x".repeat(LIMITS.MAX_CONTEXT_LENGTH);
        const result = yield* validateContext(maxContext);
        expect(result).toBeUndefined();
      }));

    it("should accept empty string context", () =>
      Effect.gen(function* () {
        const result = yield* validateContext("");
        expect(result).toBeUndefined();
      }));
  });

  describe("validateTimeout", () => {
    it("should accept valid timeout", () =>
      Effect.gen(function* () {
        const result = yield* validateTimeout(100);
        expect(result).toBeUndefined();
      }));

    it("should reject timeout below minimum", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(validateTimeout(5));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain("Timeout too low");
        }
      }));

    it("should reject timeout above maximum", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(validateTimeout(10_000));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toContain("Timeout too high");
        }
      }));

    it("should accept minimum timeout", () =>
      Effect.gen(function* () {
        const result = yield* validateTimeout(10);
        expect(result).toBeUndefined();
      }));

    it("should accept maximum timeout", () =>
      Effect.gen(function* () {
        const result = yield* validateTimeout(5000);
        expect(result).toBeUndefined();
      }));
  });

  describe("validateDialect", () => {
    it("should accept valid dialect", () =>
      Effect.gen(function* () {
        const result = yield* validateDialect("js", ["js", "re2", "pcre"]);
        expect(result).toBeUndefined();
      }));

    it("should reject invalid dialect", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          validateDialect("invalid", ["js", "re2", "pcre"])
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.message).toContain("Invalid dialect");
          expect(result.left.message).toContain("js, re2, pcre");
        }
      }));

    it("should check all valid dialects", () =>
      Effect.gen(function* () {
        const validDialects = ["js", "re2", "pcre"];

        for (const dialect of validDialects) {
          const result = yield* validateDialect(dialect, validDialects);
          expect(result).toBeUndefined();
        }
      }));
  });

  describe("toMcpError", () => {
    it("should pass through McpError unchanged", () => {
      const original = new McpError(ErrorCode.InvalidParams, "Test error");
      const result = toMcpError(original, "Context");

      expect(result).toBe(original);
      expect(result.code).toBe(ErrorCode.InvalidParams);
      expect(result.message).toContain("Test error");
    });

    it("should convert Error to McpError", () => {
      const error = new Error("Test error");
      const result = toMcpError(error, "Operation failed");

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toContain("Operation failed: Test error");
    });

    it("should handle unknown error type", () => {
      const result = toMcpError("string error", "Context");

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toContain("Context");
    });

    it("should include context in message", () => {
      const error = new Error("Original message");
      const result = toMcpError(error, "Custom context");

      expect(result.message).toContain("Custom context");
      expect(result.message).toContain("Original message");
    });
  });
});
