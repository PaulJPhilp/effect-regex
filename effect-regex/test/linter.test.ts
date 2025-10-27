/**
 * Linter Tests
 * Tests for regex pattern linting and validation
 */

import { describe, expect, it } from "@effect/vitest";
import { RegexBuilder } from "../src/core/builder.js";
import { lint } from "../src/core/linter.js";

describe("Linter", () => {
  describe("Backreference Validation", () => {
    it("should detect undefined named backreference", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.backref("nonexistent"));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("UNDEFINED_BACKREF");
      expect(result.issues[0].message).toContain('"nonexistent"');
    });

    it("should detect undefined numbered backreference", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.backref(1));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("UNDEFINED_BACKREF");
      expect(result.issues[0].message).toContain("#1");
    });

    it("should accept valid named backreference", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.backref("word"));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should accept valid numbered backreference", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture()
        .then(RegexBuilder.backref(1));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect backreferences in RE2 dialect", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.backref("word"));

      const result = lint(pattern.getAst(), "re2");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "RE2_BACKREFS")).toBe(true);
    });
  });

  describe("Assertion Validation", () => {
    it("should accept lookahead in all dialects", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lookahead(RegexBuilder.digit()));

      expect(lint(pattern.getAst(), "js").valid).toBe(true);
      expect(lint(pattern.getAst(), "re2").valid).toBe(true);
      expect(lint(pattern.getAst(), "pcre").valid).toBe(true);
    });

    it("should accept negative lookahead in all dialects", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.negativeLookahead(RegexBuilder.digit()));

      expect(lint(pattern.getAst(), "js").valid).toBe(true);
      expect(lint(pattern.getAst(), "re2").valid).toBe(true);
      expect(lint(pattern.getAst(), "pcre").valid).toBe(true);
    });

    it("should detect lookbehind in RE2 dialect", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = lint(pattern.getAst(), "re2");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "RE2_LOOKBEHIND")).toBe(true);
      expect(result.issues[0].message).toContain("lookbehind");
    });

    it("should detect negative lookbehind in RE2 dialect", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .negativeLookbehind(RegexBuilder.lit("$"));

      const result = lint(pattern.getAst(), "re2");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "RE2_LOOKBEHIND")).toBe(true);
      expect(result.issues[0].message).toContain("negative-lookbehind");
    });

    it("should accept lookbehind in JS dialect", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should accept lookbehind in PCRE dialect", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = lint(pattern.getAst(), "pcre");
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("Complexity Estimation", () => {
    it("should estimate complexity for backreferences", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.backref("word"));

      const result = lint(pattern.getAst(), "js");
      // Should not trigger HIGH_COMPLEXITY warning
      expect(result.issues.some((i) => i.code === "HIGH_COMPLEXITY")).toBe(
        false
      );
    });

    it("should estimate complexity for assertions", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lookahead(RegexBuilder.digit()));

      const result = lint(pattern.getAst(), "js");
      // Should not trigger HIGH_COMPLEXITY warning
      expect(result.issues.some((i) => i.code === "HIGH_COMPLEXITY")).toBe(
        false
      );
    });

    it("should detect high complexity with nested quantifiers", () => {
      // Create a very complex pattern with many nested elements
      let pattern = RegexBuilder.any();
      for (let i = 0; i < 50; i++) {
        pattern = pattern.oneOrMore();
      }

      const result = lint(pattern.getAst(), "js");
      expect(result.issues.some((i) => i.code === "HIGH_COMPLEXITY")).toBe(
        true
      );
    });
  });

  describe("Named Groups in RE2", () => {
    it("should detect named groups in RE2 dialect", () => {
      const pattern = RegexBuilder.word().oneOrMore().capture("word");

      const result = lint(pattern.getAst(), "re2");
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "RE2_NAMED_GROUPS")).toBe(
        true
      );
    });

    it("should accept unnamed groups in RE2 dialect", () => {
      const pattern = RegexBuilder.word().oneOrMore().capture();

      const result = lint(pattern.getAst(), "re2");
      expect(result.valid).toBe(true);
    });
  });

  describe("Empty Alternatives", () => {
    it("should detect empty alternatives", () => {
      const pattern = RegexBuilder.alt(
        RegexBuilder.lit("test"),
        RegexBuilder.lit("")
      );

      const result = lint(pattern.getAst(), "js");
      expect(result.issues.some((i) => i.code === "EMPTY_ALT")).toBe(true);
    });

    it("should accept non-empty alternatives", () => {
      const pattern = RegexBuilder.alt(
        RegexBuilder.lit("test"),
        RegexBuilder.lit("hello")
      );

      const result = lint(pattern.getAst(), "js");
      expect(result.issues.some((i) => i.code === "EMPTY_ALT")).toBe(false);
    });
  });

  describe("Complex Patterns", () => {
    it("should validate pattern with multiple backreferences", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("first")
        .then(RegexBuilder.digit().oneOrMore().capture("second"))
        .then(RegexBuilder.backref("first"))
        .then(RegexBuilder.backref("second"));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
    });

    it("should validate pattern with assertions and backreferences", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.lookahead(RegexBuilder.digit()))
        .then(RegexBuilder.backref("word"));

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
    });

    it("should detect multiple issues in RE2", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.backref("word"))
        .lookbehind(RegexBuilder.lit("@"));

      const result = lint(pattern.getAst(), "re2");
      expect(result.valid).toBe(false);
      // Should have at least 2 errors: named groups, backrefs, and lookbehind
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(result.issues.some((i) => i.code === "RE2_NAMED_GROUPS")).toBe(
        true
      );
      expect(result.issues.some((i) => i.code === "RE2_BACKREFS")).toBe(true);
      expect(result.issues.some((i) => i.code === "RE2_LOOKBEHIND")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty pattern", () => {
      const pattern = RegexBuilder.lit("");

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
    });

    it("should handle pattern with only assertions", () => {
      const pattern = RegexBuilder.lookahead(RegexBuilder.digit());

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
    });

    it("should handle nested assertions", () => {
      const pattern = RegexBuilder.lookahead(
        RegexBuilder.lookahead(RegexBuilder.digit())
      );

      const result = lint(pattern.getAst(), "js");
      expect(result.valid).toBe(true);
    });

    it("should handle backreference to later group (forward reference)", () => {
      // This is a forward reference which is typically invalid in regex
      // but our linter only checks if the group exists somewhere in the pattern
      const pattern = RegexBuilder.backref("word").then(
        RegexBuilder.word().oneOrMore().capture("word")
      );

      const result = lint(pattern.getAst(), "js");
      // The group exists, so linter passes (runtime would fail)
      expect(result.valid).toBe(true);
    });
  });
});
