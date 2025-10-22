/**
 * Security tests for AI code interpreter
 *
 * These tests ensure that the interpreter safely handles LLM-generated code
 * without using eval() and properly rejects malicious or unsafe code patterns.
 */

import { describe, expect, it } from "@effect/vitest";
import {
  CodeInterpreterError,
  interpretRegexBuilderCode,
  validateRegexBuilderCode,
} from "../src/ai/interpreter.js";
import { RegexBuilder } from "../src/core/builder.js";

describe("AI Code Interpreter Security", () => {
  describe("Malicious Code Rejection", () => {
    it("should reject code with global access", () => {
      const malicious = 'RegexBuilder.lit("test"); global.process.exit(1)';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(/global/);
    });

    it("should reject code with process access", () => {
      const malicious = 'process.exit(1); RegexBuilder.lit("test")';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(/process/);
    });

    it("should reject code with require", () => {
      const malicious = 'const fs = require("fs"); RegexBuilder.lit("test")';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(/require/);
    });

    it("should reject code with import", () => {
      const malicious = 'import fs from "fs"; RegexBuilder.lit("test")';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(/import/);
    });

    it("should reject code with eval", () => {
      const malicious = 'eval("process.exit(1)"); RegexBuilder.lit("test")';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(/eval/);
    });

    it("should reject code with Function constructor", () => {
      const malicious =
        'new Function("return process")(); RegexBuilder.lit("test")';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(/Function/);
    });

    it("should reject code without RegexBuilder", () => {
      const malicious = 'console.log("hello")';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        /RegexBuilder/
      );
    });

    it("should reject code with disallowed static methods", () => {
      const malicious = "RegexBuilder.dangerousMethod()";

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        /Disallowed static method/
      );
    });

    it("should reject code with disallowed instance methods", () => {
      const malicious = 'RegexBuilder.lit("test").dangerousMethod()';

      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(malicious)).toThrow(
        /Disallowed instance method/
      );
    });
  });

  describe("Malformed Code Handling", () => {
    it("should reject incomplete code", () => {
      const incomplete = 'RegexBuilder.lit("test").then(';

      expect(() => interpretRegexBuilderCode(incomplete)).toThrow(
        CodeInterpreterError
      );
    });

    it("should reject empty code", () => {
      expect(() => interpretRegexBuilderCode("")).toThrow(CodeInterpreterError);
    });

    it("should reject code with only whitespace", () => {
      expect(() => interpretRegexBuilderCode("   \n\t  ")).toThrow(
        CodeInterpreterError
      );
    });

    it("should reject code with unterminated string", () => {
      const unterminated = 'RegexBuilder.lit("test';

      expect(() => interpretRegexBuilderCode(unterminated)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(unterminated)).toThrow(
        /Unterminated string/
      );
    });

    it("should reject code with unclosed parenthesis", () => {
      const unclosed = 'RegexBuilder.lit("test"';

      expect(() => interpretRegexBuilderCode(unclosed)).toThrow(
        CodeInterpreterError
      );
    });

    it("should reject code with unexpected tokens", () => {
      const unexpected = 'RegexBuilder.lit("test") + "foo"';

      expect(() => interpretRegexBuilderCode(unexpected)).toThrow(
        CodeInterpreterError
      );
    });

    it("should reject code with wrong argument types", () => {
      const wrongType = "RegexBuilder.lit(function() {})";

      expect(() => interpretRegexBuilderCode(wrongType)).toThrow(
        CodeInterpreterError
      );
    });
  });

  describe("Valid Code Acceptance", () => {
    it("should accept simple literal pattern", () => {
      const valid = 'RegexBuilder.lit("test")';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept fluent builder chain", () => {
      const valid = 'RegexBuilder.lit("test").then("foo").oneOrMore()';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept static alt method", () => {
      const valid =
        'RegexBuilder.alt(RegexBuilder.lit("a"), RegexBuilder.lit("b"))';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept character class", () => {
      const valid = 'RegexBuilder.charClass("a-z")';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept digit pattern", () => {
      const valid = "RegexBuilder.digit().oneOrMore()";
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept complex chain", () => {
      const valid =
        'RegexBuilder.lit("hello").then(RegexBuilder.digit().oneOrMore()).or("world")';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept quantifiers with parameters", () => {
      const valid = 'RegexBuilder.lit("a").exactly(5)';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept between quantifier", () => {
      const valid = "RegexBuilder.digit().between(2, 4)";
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept capture groups", () => {
      const valid = 'RegexBuilder.lit("test").capture("name")';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept anchors", () => {
      const valid = 'RegexBuilder.lit("test").startOfLine().endOfLine()';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept lazy quantifiers", () => {
      const valid = "RegexBuilder.any().zeroOrMore(true)";
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept escaped strings", () => {
      const valid = 'RegexBuilder.lit("test\\"with\\"quotes")';
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept single quotes", () => {
      const valid = "RegexBuilder.lit('test')";
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept backticks", () => {
      const valid = "RegexBuilder.lit(`test`)";
      const result = interpretRegexBuilderCode(valid);

      expect(result).toBeInstanceOf(RegexBuilder);
    });
  });

  describe("Boundary Cases", () => {
    it("should handle very long valid code", () => {
      const longChain = "RegexBuilder.lit('a')" + ".then('b')".repeat(50);

      expect(() => interpretRegexBuilderCode(longChain)).not.toThrow();

      const result = interpretRegexBuilderCode(longChain);
      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should reject code exceeding maximum depth", () => {
      const tooDeep = "RegexBuilder.lit('a')" + ".then('b')".repeat(200);

      expect(() => interpretRegexBuilderCode(tooDeep)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(tooDeep)).toThrow(/maximum depth/);
    });

    it("should reject code exceeding size limit", () => {
      const huge = "RegexBuilder.lit('a')" + ".then('b')".repeat(5000);

      expect(() => interpretRegexBuilderCode(huge)).toThrow(
        CodeInterpreterError
      );
      expect(() => interpretRegexBuilderCode(huge)).toThrow(/maximum length/);
    });

    it("should handle code with many arguments", () => {
      const manyArgs = "RegexBuilder.digit().between(1, 100)";

      expect(() => interpretRegexBuilderCode(manyArgs)).not.toThrow();
    });

    it("should handle nested alt calls", () => {
      const nested =
        'RegexBuilder.alt(RegexBuilder.lit("a"), RegexBuilder.alt(RegexBuilder.lit("b"), RegexBuilder.lit("c")))';

      expect(() => interpretRegexBuilderCode(nested)).not.toThrow();
    });
  });

  describe("Validation Function", () => {
    it("should return true for valid code", () => {
      const valid = 'RegexBuilder.lit("test").oneOrMore()';

      expect(validateRegexBuilderCode(valid)).toBe(true);
    });

    it("should return false for invalid code", () => {
      const invalid = "RegexBuilder.dangerousMethod()";

      expect(validateRegexBuilderCode(invalid)).toBe(false);
    });

    it("should return false for malicious code", () => {
      const malicious = 'eval("bad"); RegexBuilder.lit("test")';

      expect(validateRegexBuilderCode(malicious)).toBe(false);
    });

    it("should return false for malformed code", () => {
      const malformed = 'RegexBuilder.lit("test"';

      expect(validateRegexBuilderCode(malformed)).toBe(false);
    });
  });

  describe("Real LLM-like Code Patterns", () => {
    it("should accept typical LLM-generated email pattern", () => {
      const llmCode = `RegexBuilder
        .charClass("a-zA-Z0-9._%+-")
        .oneOrMore()
        .then(RegexBuilder.lit("@"))
        .then(RegexBuilder.charClass("a-zA-Z0-9.-").oneOrMore())
        .then(RegexBuilder.lit("."))
        .then(RegexBuilder.charClass("a-zA-Z").between(2, 10))
        .capture("email")`;

      expect(() => interpretRegexBuilderCode(llmCode)).not.toThrow();

      const result = interpretRegexBuilderCode(llmCode);
      expect(result).toBeInstanceOf(RegexBuilder);
    });

    it("should accept typical LLM-generated URL pattern", () => {
      const llmCode = `RegexBuilder
        .lit("https://")
        .then(RegexBuilder.word().oneOrMore())
        .then(RegexBuilder.lit("."))
        .then(RegexBuilder.word().between(2, 6))`;

      expect(() => interpretRegexBuilderCode(llmCode)).not.toThrow();
    });

    it("should accept typical LLM-generated phone pattern", () => {
      const llmCode = `RegexBuilder
        .lit("(")
        .then(RegexBuilder.digit().exactly(3))
        .then(RegexBuilder.lit(")"))
        .then(RegexBuilder.whitespace().optional())
        .then(RegexBuilder.digit().exactly(3))
        .then(RegexBuilder.lit("-"))
        .then(RegexBuilder.digit().exactly(4))`;

      expect(() => interpretRegexBuilderCode(llmCode)).not.toThrow();
    });
  });

  describe("Error Messages", () => {
    it("should provide helpful error for missing method", () => {
      const invalid = "RegexBuilder.invalidMethod()";

      try {
        interpretRegexBuilderCode(invalid);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CodeInterpreterError);
        expect((error as CodeInterpreterError).message).toContain(
          "invalidMethod"
        );
        expect((error as CodeInterpreterError).code).toBe(invalid);
      }
    });

    it("should provide helpful error for syntax errors", () => {
      const invalid = 'RegexBuilder.lit("test").)';

      try {
        interpretRegexBuilderCode(invalid);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CodeInterpreterError);
        expect((error as CodeInterpreterError).code).toBe(invalid);
      }
    });

    it("should include position information in errors", () => {
      const invalid = "RegexBuilder.lit('test').bad()";

      try {
        interpretRegexBuilderCode(invalid);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CodeInterpreterError);
        // Error should mention the problematic method
        expect((error as CodeInterpreterError).message).toContain("bad");
      }
    });
  });
});
