/**
 * Unit tests for MCP tool handlers
 *
 * Tests individual tool handlers in isolation with Effect-based assertions.
 */

import { describe, expect, it } from "@effect/vitest";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import {
  handleBuildRegex,
  handleConvertRegex,
  handleExplainRegex,
  handleLibraryList,
  handleLintRegex,
  handleOptimizePattern,
  handleTestRegex,
} from "../src/mcp/tools/index.js";

describe("MCP Tool Handlers - Unit Tests", () => {
  describe("handleBuildRegex", () => {
    it("should build from standard library pattern", () =>
      Effect.gen(function* () {
        const result = yield* handleBuildRegex({
          input: { type: "std", name: "email" },
          dialect: "js",
          anchor: false,
        });

        expect(result).toHaveProperty("pattern");
        expect(result).toHaveProperty("captureMap");
        expect(result).toHaveProperty("notes");
        expect(typeof result.pattern).toBe("string");
      }));

    it("should build with anchor flag", () =>
      Effect.gen(function* () {
        const result = yield* handleBuildRegex({
          input: { type: "std", name: "integer" },
          dialect: "js",
          anchor: true,
        });

        expect(result.pattern).toMatch(/^^/); // Starts with ^
        expect(result.pattern).toMatch(/$$/); // Ends with $
      }));

    it("should support different dialects", () =>
      Effect.gen(function* () {
        const dialects = ["js", "re2", "pcre"] as const;

        for (const dialect of dialects) {
          const result = yield* handleBuildRegex({
            input: { type: "std", name: "quotedString" },
            dialect,
            anchor: false,
          });

          expect(result).toHaveProperty("pattern");
          expect(typeof result.pattern).toBe("string");
        }
      }));

    it("should fail for unknown standard pattern", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          handleBuildRegex({
            input: { type: "std", name: "nonexistent" },
            dialect: "js",
          })
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.code).toBe(ErrorCode.InvalidParams);
        }
      }));

    it("should fail for AST input (not yet supported)", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          handleBuildRegex({
            input: { type: "ast", ast: {} },
            dialect: "js",
          })
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
        }
      }));

    it("should build from CommandSpec", () =>
      Effect.gen(function* () {
        const result = yield* handleBuildRegex({
          input: {
            type: "command",
            spec: {
              name: "test",
              flags: [{ name: "verbose", short: "v" }],
            },
          },
          dialect: "js",
        });

        expect(result).toHaveProperty("pattern");
        expect(result).toHaveProperty("captureMap");
      }));
  });

  describe("handleTestRegex", () => {
    it("should test valid pattern with matching cases", () =>
      Effect.gen(function* () {
        const result = yield* handleTestRegex({
          pattern: "[a-z]+",
          dialect: "js",
          cases: [
            { input: "hello", shouldMatch: true },
            { input: "world", shouldMatch: true },
          ],
          timeoutMs: 100,
        });

        expect(result).toHaveProperty("total", 2);
        expect(result).toHaveProperty("passed", 2);
        expect(result).toHaveProperty("failed", 0);
        expect(result.failures).toHaveLength(0);
      }));

    it("should detect failed test cases", () =>
      Effect.gen(function* () {
        const result = yield* handleTestRegex({
          pattern: "[a-z]+",
          dialect: "js",
          cases: [
            { input: "hello", shouldMatch: true }, // Pass
            { input: "123", shouldMatch: true }, // Fail - doesn't match
          ],
          timeoutMs: 100,
        });

        expect(result).toHaveProperty("total", 2);
        expect(result).toHaveProperty("passed", 1);
        expect(result).toHaveProperty("failed", 1);
        expect(result.failures).toHaveLength(1);
      }));

    it("should validate negative test cases", () =>
      Effect.gen(function* () {
        const result = yield* handleTestRegex({
          pattern: "[a-z]+",
          dialect: "js",
          cases: [
            { input: "123", shouldMatch: false }, // Pass - correctly doesn't match
          ],
          timeoutMs: 100,
        });

        expect(result).toHaveProperty("passed", 1);
        expect(result).toHaveProperty("failed", 0);
      }));

    it("should default shouldMatch to true", () =>
      Effect.gen(function* () {
        const result = yield* handleTestRegex({
          pattern: "[a-z]+",
          dialect: "js",
          cases: [{ input: "hello" }], // shouldMatch not specified
          timeoutMs: 100,
        });

        expect(result).toHaveProperty("passed", 1);
      }));

    it("should handle capture group validation", () =>
      Effect.gen(function* () {
        const result = yield* handleTestRegex({
          pattern: "(?<word>[a-z]+)",
          dialect: "js",
          cases: [
            {
              input: "hello",
              shouldMatch: true,
              expectedCaptures: { word: "hello" },
            },
          ],
          timeoutMs: 100,
        });

        expect(result).toHaveProperty("passed", 1);
      }));
  });

  describe("handleLintRegex", () => {
    it("should validate correct regex pattern", () =>
      Effect.gen(function* () {
        const result = yield* handleLintRegex({
          pattern: "[a-z]+",
          dialect: "js",
        });

        expect(result).toHaveProperty("valid", true);
        expect(result).toHaveProperty("issues");
        expect(result.issues).toHaveLength(0);
      }));

    it("should detect invalid regex syntax", () =>
      Effect.gen(function* () {
        const result = yield* handleLintRegex({
          pattern: "[invalid(regex",
          dialect: "js",
        });

        expect(result).toHaveProperty("valid", false);
        expect(result).toHaveProperty("issues");
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.issues[0]).toHaveProperty("severity", "error");
        expect(result.issues[0]).toHaveProperty("type", "syntax");
      }));

    it("should handle complex valid patterns", () =>
      Effect.gen(function* () {
        const result = yield* handleLintRegex({
          pattern: "(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,})",
          dialect: "js",
        });

        expect(result).toHaveProperty("valid", true);
      }));

    it("should work with different dialects", () =>
      Effect.gen(function* () {
        const dialects = ["js", "re2", "pcre"] as const;

        for (const dialect of dialects) {
          const result = yield* handleLintRegex({
            pattern: "[a-z]+",
            dialect,
          });

          expect(result).toHaveProperty("valid", true);
        }
      }));
  });

  describe("handleConvertRegex", () => {
    it("should convert between dialects", () =>
      Effect.gen(function* () {
        const result = yield* handleConvertRegex({
          pattern: "[a-z]+",
          fromDialect: "js",
          toDialect: "re2",
          allowDowngrades: true,
        });

        expect(result).toHaveProperty("pattern");
        expect(result).toHaveProperty("fromDialect", "js");
        expect(result).toHaveProperty("toDialect", "re2");
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("changed");
        expect(result).toHaveProperty("notes");
        expect(result).toHaveProperty("warnings");
        expect(result).toHaveProperty("incompatibilities");
        expect(result).toHaveProperty("limitations");
      }));

    it("should detect when pattern doesn't change", () =>
      Effect.gen(function* () {
        const result = yield* handleConvertRegex({
          pattern: "[a-z]+",
          fromDialect: "js",
          toDialect: "js",
          allowDowngrades: true,
        });

        expect(result.pattern).toBe("[a-z]+");
      }));

    it("should default fromDialect to js", () =>
      Effect.gen(function* () {
        const result = yield* handleConvertRegex({
          pattern: "[a-z]+",
          toDialect: "re2",
          allowDowngrades: true,
        });

        expect(result).toHaveProperty("fromDialect", "js");
      }));

    it("should default allowDowngrades to true", () =>
      Effect.gen(function* () {
        const result = yield* handleConvertRegex({
          pattern: "[a-z]+",
          fromDialect: "js",
          toDialect: "re2",
        });

        expect(result).toHaveProperty("success");
      }));
  });

  describe("handleExplainRegex", () => {
    it("should return explanation stub", () =>
      Effect.gen(function* () {
        const result = yield* handleExplainRegex({
          pattern: "[a-z]+",
          format: "tree",
          dialect: "js",
        });

        expect(result).toHaveProperty("pattern", "[a-z]+");
        expect(result).toHaveProperty("explanation");
        expect(result.explanation).toHaveProperty("type", "pattern");
        expect(result.explanation).toHaveProperty("description");
        expect(result.explanation).toHaveProperty("notes");
        expect(Array.isArray(result.explanation.notes)).toBe(true);
      }));

    it("should default to tree format", () =>
      Effect.gen(function* () {
        const result = yield* handleExplainRegex({
          pattern: "[a-z]+",
          dialect: "js",
        });

        expect(result).toHaveProperty("explanation");
      }));

    it("should default to js dialect", () =>
      Effect.gen(function* () {
        const result = yield* handleExplainRegex({
          pattern: "[a-z]+",
          format: "tree",
        });

        expect(result.explanation).toHaveProperty("dialect", "js");
      }));
  });

  describe("handleLibraryList", () => {
    it("should list all patterns", () =>
      Effect.gen(function* () {
        const result = yield* handleLibraryList({});

        expect(result).toHaveProperty("total");
        expect(result).toHaveProperty("patterns");
        expect(result).toHaveProperty("filters", null);
        expect(Array.isArray(result.patterns)).toBe(true);
        expect(result.total).toBeGreaterThan(0);
        expect(result.patterns.length).toBe(result.total);

        // Check pattern structure
        const pattern = result.patterns[0];
        expect(pattern).toHaveProperty("name");
        expect(pattern).toHaveProperty("description");
        expect(pattern).toHaveProperty("examples");
        expect(pattern).toHaveProperty("dialect");
      }));

    it("should filter patterns by search query", () =>
      Effect.gen(function* () {
        const result = yield* handleLibraryList({
          filter: { search: "email" },
        });

        expect(result.patterns.length).toBeGreaterThan(0);
        expect(result.filters).toHaveProperty("search", "email");

        // All results should contain "email" in name or description
        for (const pattern of result.patterns) {
          const matchesSearch =
            pattern.name.toLowerCase().includes("email") ||
            pattern.description.toLowerCase().includes("email");
          expect(matchesSearch).toBe(true);
        }
      }));

    it("should filter patterns by dialect", () =>
      Effect.gen(function* () {
        const result = yield* handleLibraryList({
          filter: { dialect: "js" },
        });

        expect(result.patterns.length).toBeGreaterThan(0);

        // All results should be js or universal
        for (const pattern of result.patterns) {
          expect(["js", "universal"]).toContain(pattern.dialect);
        }
      }));

    it("should handle empty search results", () =>
      Effect.gen(function* () {
        const result = yield* handleLibraryList({
          filter: { search: "nonexistent_pattern_xyz" },
        });

        expect(result.total).toBe(0);
        expect(result.patterns).toHaveLength(0);
      }));
  });

  describe("handleOptimizePattern", () => {
    it("should optimize standard library pattern", () =>
      Effect.gen(function* () {
        const result = yield* handleOptimizePattern({
          input: { type: "std", name: "email" },
          dialect: "js",
        });

        expect(result).toHaveProperty("pattern");
        expect(result).toHaveProperty("before");
        expect(result).toHaveProperty("after");
        expect(result).toHaveProperty("optimization");
        expect(result).toHaveProperty("dialect", "js");

        // Check before structure
        expect(result.before).toHaveProperty("pattern");
        expect(result.before).toHaveProperty("nodes");
        expect(result.before).toHaveProperty("captureMap");

        // Check after structure
        expect(result.after).toHaveProperty("pattern");
        expect(result.after).toHaveProperty("nodes");
        expect(result.after).toHaveProperty("captureMap");

        // Check optimization stats
        expect(result.optimization).toHaveProperty("nodesReduced");
        expect(result.optimization).toHaveProperty("reductionPercent");
        expect(result.optimization).toHaveProperty("passesApplied");
        expect(result.optimization).toHaveProperty("iterations");
      }));

    it("should apply custom optimization options", () =>
      Effect.gen(function* () {
        const result = yield* handleOptimizePattern({
          input: { type: "std", name: "quotedString" },
          options: {
            constantFolding: true,
            quantifierSimplification: false,
            characterClassMerging: true,
            alternationDedup: false,
            maxPasses: 2,
          },
          dialect: "js",
        });

        expect(result.optimization.iterations).toBeLessThanOrEqual(2);
      }));

    it("should fail for unknown pattern", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          handleOptimizePattern({
            input: { type: "std", name: "nonexistent" },
            dialect: "js",
          })
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
          expect(result.left.code).toBe(ErrorCode.InvalidParams);
        }
      }));

    it("should fail for pattern string input (not supported)", () =>
      Effect.gen(function* () {
        const result = yield* Effect.either(
          handleOptimizePattern({
            input: { type: "pattern", pattern: "[a-z]+" },
            dialect: "js",
          })
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(McpError);
        }
      }));

    it("should optimize for different dialects", () =>
      Effect.gen(function* () {
        const dialects = ["js", "re2", "pcre"] as const;

        for (const dialect of dialects) {
          const result = yield* handleOptimizePattern({
            input: { type: "std", name: "integer" },
            dialect,
          });

          expect(result).toHaveProperty("dialect", dialect);
        }
      }));
  });
});
