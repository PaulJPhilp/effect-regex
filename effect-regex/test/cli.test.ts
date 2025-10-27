import { execSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "@effect/vitest";

const CLI_PATH = "./dist/bin.cjs";

describe("CLI Integration Tests", () => {
  const tempFiles: string[] = [];

  // Helper to run CLI commands
  const runCLI = (args: string, expectError = false): string => {
    try {
      return execSync(`node ${CLI_PATH} ${args}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      if (expectError) {
        return (error as any).stdout || (error as any).stderr || "";
      }
      throw error;
    }
  };

  // Cleanup temp files after tests
  afterAll(() => {
    for (const file of tempFiles) {
      try {
        unlinkSync(file);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("build-pattern command", () => {
    it("should build a standard library pattern (integer)", () => {
      const output = runCLI("build-pattern integer");
      const result = JSON.parse(output);

      expect(result).toHaveProperty("pattern");
      expect(result).toHaveProperty("notes");
      expect(result).toHaveProperty("captureMap");
      expect(typeof result.pattern).toBe("string");
    });

    it("should error on unknown pattern", () => {
      const output = runCLI("build-pattern nonexistent", true);
      expect(output).toContain("Unknown standard pattern");
    });

    it("should list available patterns on error", () => {
      const output = runCLI("build-pattern invalid", true);
      expect(output).toContain("quotedString");
      expect(output).toContain("integer");
    });
  });

  describe("lint command", () => {
    it("should validate correct regex pattern", () => {
      const output = runCLI('lint "[a-z]+"');
      const result = JSON.parse(output);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it("should detect invalid regex pattern", () => {
      // Use invalid quantifier range (max < min) - properly escaped
      const output = runCLI('lint "a{5,2}"', true);
      const result = JSON.parse(output);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toHaveProperty("severity", "error");
    });
  });

  describe("explain command", () => {
    it("should explain a standard library pattern", () => {
      const output = runCLI("explain integer");
      const result = JSON.parse(output);

      expect(result).toHaveProperty("pattern", "integer");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("explanation");
      expect(result).toHaveProperty("formatted");
    });

    it("should support summary format", () => {
      const output = runCLI("explain quotedString --format=summary");
      const result = JSON.parse(output);

      expect(result).toHaveProperty("pattern", "quotedString");
      expect(result).toHaveProperty("explanation");
      expect(result).toHaveProperty("regexPattern");
      expect(result).not.toHaveProperty("formatted");
    });

    it("should error on unknown pattern", () => {
      const output = runCLI("explain unknownPattern", true);
      expect(output).toContain("Unknown standard pattern");
    });
  });

  describe("test command", () => {
    it("should run tests from JSON file (all passing)", () => {
      const testFile = "test-cli-passing.json";
      tempFiles.push(testFile);

      writeFileSync(
        testFile,
        JSON.stringify([
          { input: "123", shouldMatch: true },
          { input: "456", shouldMatch: true },
          { input: "abc", shouldMatch: false },
        ])
      );

      const output = runCLI(`test "^\\d+$" ${testFile}`);
      const result = JSON.parse(output);

      expect(result.total).toBe(3);
      expect(result.passed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.successRate).toBe(100);
      expect(result.failures).toEqual([]);
    });

    it("should detect test failures", () => {
      const testFile = "test-cli-failures.json";
      tempFiles.push(testFile);

      writeFileSync(
        testFile,
        JSON.stringify([
          { input: "123", shouldMatch: false }, // Will fail
          { input: "abc", shouldMatch: true }, // Will fail
        ])
      );

      const output = runCLI(`test "^\\d+$" ${testFile}`, true);
      const result = JSON.parse(output);

      expect(result.total).toBe(2);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.successRate).toBe(0);
      expect(result.failures.length).toBe(2);

      expect(result.failures[0]).toHaveProperty("input", "123");
      expect(result.failures[0]).toHaveProperty("expectedMatch", false);
      expect(result.failures[0]).toHaveProperty("actualMatch", true);
    });

    it("should handle invalid JSON file", () => {
      const testFile = "test-cli-invalid.json";
      tempFiles.push(testFile);

      writeFileSync(testFile, "{ invalid json }");

      const output = runCLI(`test "\\d+" ${testFile}`, true);
      expect(output).toContain("Error parsing JSON");
    });

    it("should validate test case structure", () => {
      const testFile = "test-cli-badstructure.json";
      tempFiles.push(testFile);

      writeFileSync(
        testFile,
        JSON.stringify([{ input: "test" }]) // Missing shouldMatch
      );

      const output = runCLI(`test "\\d+" ${testFile}`, true);
      expect(output).toContain("shouldMatch");
    });
  });

  describe("optimize command", () => {
    it("should optimize a standard library pattern", () => {
      const output = runCLI("optimize integer");
      const result = JSON.parse(output);

      expect(result).toHaveProperty("pattern", "integer");
      expect(result).toHaveProperty("before");
      expect(result).toHaveProperty("after");
      expect(result).toHaveProperty("optimization");

      expect(result.optimization).toHaveProperty("nodesReduced");
      expect(result.optimization).toHaveProperty("passesApplied");
    });

    it("should error on unknown pattern", () => {
      const output = runCLI("optimize unknownPattern", true);
      expect(output).toContain("Unknown standard pattern");
    });
  });

  describe("help command", () => {
    it("should display help text", () => {
      const output = runCLI("--help");

      expect(output).toContain("effect-regex");
      expect(output).toContain("Commands:");
      expect(output).toContain("build-pattern");
      expect(output).toContain("lint");
      expect(output).toContain("explain");
      expect(output).toContain("test");
      expect(output).toContain("optimize");
    });

    it("should list available patterns in help", () => {
      const output = runCLI("--help");

      expect(output).toContain("quotedString");
      expect(output).toContain("integer");
      expect(output).toContain("uuidV4");
    });
  });

  describe("error handling", () => {
    it("should error on unknown command", () => {
      const output = runCLI("unknownCommand", true);
      expect(output).toContain("Unknown command");
    });

    it("should show usage on missing arguments", () => {
      const output = runCLI("build-pattern", true);
      expect(output).toContain("Usage:");
    });
  });
});
