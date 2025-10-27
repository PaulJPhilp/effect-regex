/**
 * TryCapture Tests
 * Tests for TryCapture AST node and RegexBuilder API
 */

import { describe, expect, it } from "@effect/vitest";
import { tryCapture } from "../src/core/ast.js";
import { emit, RegexBuilder } from "../src/core/builder.js";
import { lint } from "../src/core/linter.js";

describe("TryCapture", () => {
  describe("Basic TryCapture", () => {
    it("should create trycapture pattern without validation", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("word");

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<word>[a-zA-Z0-9_]+)");
    });

    it("should create trycapture pattern with validation metadata", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("email", {
        description: "must contain @",
      });

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<email>[a-zA-Z0-9_]+)");
      expect(
        result.notes.some((n) => n.includes("TryCapture validation"))
      ).toBe(true);
      expect(result.notes.some((n) => n.includes("must contain @"))).toBe(true);
    });

    it("should create trycapture with validation pattern", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("email", {
        description: "must be valid email",
        pattern: ".*@.*",
      });

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<email>[a-zA-Z0-9_]+)");
      expect(result.notes.some((n) => n.includes("pattern: .*@.*"))).toBe(true);
    });

    it("should create unnamed trycapture", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture();

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("([a-zA-Z0-9_]+)");
    });
  });

  describe("TryCapture with Backreferences", () => {
    it("should allow backreferences to trycapture groups", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .tryCapture("word", {
          description: "must be alphanumeric",
        })
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref("word"));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<word>[a-zA-Z0-9_]+)[\\s]+\\k<word>");

      const lintResult = lint(pattern.getAst(), "js");
      expect(lintResult.valid).toBe(true);
    });

    it("should detect backreferences to trycapture in linter", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .tryCapture("word")
        .then(RegexBuilder.backref("word"));

      const lintResult = lint(pattern.getAst(), "js");
      expect(lintResult.valid).toBe(true);
    });
  });

  describe("Dialect Support", () => {
    it("should support named trycapture in JS dialect", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("test");

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<test>[a-zA-Z0-9_]+)");
    });

    it("should support named trycapture in PCRE dialect", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("test");

      const result = emit(pattern, "pcre");
      expect(result.pattern).toBe("(?<test>[a-zA-Z0-9_]+)");
    });

    it("should downgrade named trycapture in RE2 dialect", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("test");

      const result = emit(pattern, "re2");
      expect(result.pattern).toBe("([a-zA-Z0-9_]+)");
      expect(
        result.notes.some((n) => n.includes("downgraded to numbered group"))
      ).toBe(true);
    });
  });

  describe("Linter Integration", () => {
    it("should detect named groups in RE2", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("test");

      const lintResult = lint(pattern.getAst(), "re2");
      expect(lintResult.valid).toBe(false);
      expect(lintResult.issues.some((i) => i.code === "RE2_NAMED_GROUPS")).toBe(
        true
      );
    });

    it("should accept unnamed trycapture in RE2", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture();

      const lintResult = lint(pattern.getAst(), "re2");
      expect(lintResult.valid).toBe(true);
    });

    it("should track trycapture groups for backreference validation", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .tryCapture("first")
        .then(RegexBuilder.word().oneOrMore().tryCapture("second"))
        .then(RegexBuilder.backref("first"))
        .then(RegexBuilder.backref("second"));

      const lintResult = lint(pattern.getAst(), "js");
      expect(lintResult.valid).toBe(true);
    });
  });

  describe("Complexity Estimation", () => {
    it("should estimate complexity for trycapture groups", () => {
      const pattern = RegexBuilder.word().oneOrMore().tryCapture("test");

      const lintResult = lint(pattern.getAst(), "js");
      expect(lintResult.issues.some((i) => i.code === "HIGH_COMPLEXITY")).toBe(
        false
      );
    });

    it("should handle complex trycapture patterns", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .tryCapture("first")
        .then(RegexBuilder.digit().oneOrMore().tryCapture("second"))
        .then(RegexBuilder.any().zeroOrMore().tryCapture("third"));

      const lintResult = lint(pattern.getAst(), "js");
      // Should not trigger complexity warning for reasonable patterns
      expect(lintResult.issues.some((i) => i.code === "HIGH_COMPLEXITY")).toBe(
        false
      );
    });
  });

  describe("AST Constructor", () => {
    it("should create TryCaptureNode without validation", () => {
      const node = tryCapture({ type: "lit", value: "test" }, "name");
      expect(node.type).toBe("trycapture");
      expect(node.name).toBe("name");
      expect(node.validation).toBeUndefined();
    });

    it("should create TryCaptureNode with validation", () => {
      const node = tryCapture({ type: "lit", value: "test" }, "name", {
        description: "must be valid",
        pattern: "[a-z]+",
      });
      expect(node.type).toBe("trycapture");
      expect(node.name).toBe("name");
      expect(node.validation?.description).toBe("must be valid");
      expect(node.validation?.pattern).toBe("[a-z]+");
    });
  });

  describe("Real-World Use Cases", () => {
    it("should validate email pattern with metadata", () => {
      const pattern = RegexBuilder.charClass("a-zA-Z0-9._%+-")
        .oneOrMore()
        .then(RegexBuilder.lit("@"))
        .then(RegexBuilder.charClass("a-zA-Z0-9.-").oneOrMore())
        .then(RegexBuilder.lit("."))
        .then(RegexBuilder.charClass("a-zA-Z").between(2, 6))
        .tryCapture("email", {
          description: "must be valid email format",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$",
        });

      const result = emit(pattern, "js");
      expect(result.notes.some((n) => n.includes("must be valid email"))).toBe(
        true
      );
    });

    it("should validate phone number with format check", () => {
      const pattern = RegexBuilder.digit()
        .exactly(3)
        .then(RegexBuilder.lit("-"))
        .then(RegexBuilder.digit().exactly(3))
        .then(RegexBuilder.lit("-"))
        .then(RegexBuilder.digit().exactly(4))
        .tryCapture("phone", {
          description: "must be valid US phone number",
          pattern: "\\d{3}-\\d{3}-\\d{4}",
        });

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("123-456-7890")).toBe(true);
      expect(regex.test("123-456-789")).toBe(false);
    });

    it("should capture and validate zip code", () => {
      const pattern = RegexBuilder.digit()
        .exactly(5)
        .tryCapture("zip", {
          description: "must be 5-digit US zip code",
        })
        .then(
          RegexBuilder.lit("-")
            .then(RegexBuilder.digit().exactly(4))
            .group()
            .optional()
        );

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("12345")).toBe(true);
      expect(regex.test("12345-6789")).toBe(true);
      expect(regex.test("1234")).toBe(false);
    });

    it("should validate username format", () => {
      const pattern = RegexBuilder.charClass("a-zA-Z0-9_")
        .atLeast(3)
        .tryCapture("username", {
          description: "must be 3+ alphanumeric characters",
          pattern: "[a-zA-Z0-9_]{3,}",
        });

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("user123")).toBe(true);
      expect(regex.test("ab")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle trycapture with empty child", () => {
      const pattern = RegexBuilder.lit("").tryCapture("empty");

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<empty>)");
    });

    it("should handle nested trycapture (child is another capture)", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("inner")
        .tryCapture("outer");

      const result = emit(pattern, "js");
      // Should have two capture groups
      expect(result.pattern).toBe("(?<outer>(?<inner>[a-zA-Z0-9_]+))");
    });

    it("should handle trycapture in alternation", () => {
      const pattern = RegexBuilder.alt(
        RegexBuilder.digit().oneOrMore().tryCapture("number"),
        RegexBuilder.word().oneOrMore().tryCapture("word")
      );

      const result = emit(pattern, "js");
      expect(result.pattern).toContain("(?<number>");
      expect(result.pattern).toContain("(?<word>");
    });

    it("should handle trycapture with quantifiers", () => {
      const pattern = RegexBuilder.word().tryCapture("char").oneOrMore();

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<char>[a-zA-Z0-9_])+");
    });
  });
});
