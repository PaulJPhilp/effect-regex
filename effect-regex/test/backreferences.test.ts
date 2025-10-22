/**
 * Backreference Tests
 * Tests for backreference AST node and RegexBuilder API
 */

import { describe, expect, it } from "@effect/vitest";
import { backref } from "../src/core/ast.js";
import { emit, RegexBuilder } from "../src/core/builder.js";

describe("Backreferences", () => {
  describe("Named Backreferences", () => {
    it("should create named backreference pattern", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref("word"));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<word>[a-zA-Z0-9_]+)[\\s]+\\k<word>");
    });

    it("should match repeated words", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref("word"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("hello hello")).toBe(true);
      expect(regex.test("test test")).toBe(true);
      expect(regex.test("hello world")).toBe(false);
      expect(regex.test("test")).toBe(false);
    });

    it("should match HTML tags with backreference", () => {
      const pattern = RegexBuilder.lit("<")
        .then(RegexBuilder.word().oneOrMore().capture("tag"))
        .then(RegexBuilder.lit(">"))
        .then(RegexBuilder.any().zeroOrMore())
        .then(RegexBuilder.lit("</"))
        .then(RegexBuilder.backref("tag"))
        .then(RegexBuilder.lit(">"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("<div>content</div>")).toBe(true);
      expect(regex.test("<span>text</span>")).toBe(true);
      expect(regex.test("<div>content</span>")).toBe(false);
      expect(regex.test("<h1>title</h2>")).toBe(false);
    });
  });

  describe("Numbered Backreferences", () => {
    it("should create numbered backreference pattern", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture()
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref(1));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("([a-zA-Z0-9_]+)[\\s]+\\1");
    });

    it("should match repeated words using numbered backref", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture()
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref(1));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("the the")).toBe(true);
      expect(regex.test("is is")).toBe(true);
      expect(regex.test("the is")).toBe(false);
    });

    it("should handle multiple backreferences", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .capture()
        .then(RegexBuilder.lit("-"))
        .then(RegexBuilder.backref(1))
        .then(RegexBuilder.lit("-"))
        .then(RegexBuilder.backref(1));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("([0-9]+)-\\1-\\1");

      const regex = new RegExp(result.pattern);
      expect(regex.test("123-123-123")).toBe(true);
      expect(regex.test("42-42-42")).toBe(true);
      expect(regex.test("123-456-789")).toBe(false);
    });
  });

  describe("Dialect Support", () => {
    it("should warn for RE2 dialect", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref("word"));

      const result = emit(pattern, "re2");
      expect(result.notes).toContain(
        "Backreferences not supported in RE2 dialect"
      );
      expect(result.pattern).toContain("__BACKREF_word_UNSUPPORTED__");
    });

    it("should work in JS dialect", () => {
      const pattern = RegexBuilder.backref("test");
      const result = emit(pattern, "js");
      expect(result.notes).not.toContain(
        "Backreferences not supported in JS dialect"
      );
      expect(result.pattern).toBe("\\k<test>");
    });

    it("should work in PCRE dialect", () => {
      const pattern = RegexBuilder.backref("test");
      const result = emit(pattern, "pcre");
      expect(result.notes).not.toContain(
        "Backreferences not supported in PCRE dialect"
      );
      expect(result.pattern).toBe("\\k<test>");
    });
  });

  describe("Edge Cases", () => {
    it("should handle backreference to non-existent group (runtime will fail)", () => {
      // This tests that the builder doesn't crash
      // The linter will catch this error
      const pattern = RegexBuilder.backref("nonexistent");
      const result = emit(pattern, "js");
      expect(result.pattern).toBe("\\k<nonexistent>");
    });

    it("should handle mixed named and numbered backreferences", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("first")
        .then(RegexBuilder.lit(" "))
        .then(RegexBuilder.digit().oneOrMore().capture())
        .then(RegexBuilder.lit(" "))
        .then(RegexBuilder.backref("first"))
        .then(RegexBuilder.lit(" "))
        .then(RegexBuilder.backref(2));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe(
        "(?<first>[a-zA-Z0-9_]+) ([0-9]+) \\k<first> \\2"
      );

      const regex = new RegExp(result.pattern);
      expect(regex.test("hello 123 hello 123")).toBe(true);
      expect(regex.test("hello 123 world 456")).toBe(false);
    });

    it("should handle backreference within quantifier", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(
          RegexBuilder.lit(" ")
            .then(RegexBuilder.backref("word"))
            .group()
            .atLeast(2)
        );

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<word>[a-zA-Z0-9_]+)(?: \\k<word>){2,}");

      const regex = new RegExp(result.pattern);
      expect(regex.test("test test test")).toBe(true);
      expect(regex.test("test test test test")).toBe(true);
      expect(regex.test("test test")).toBe(false); // Needs at least 2 repetitions after first match (3 total)
      expect(regex.test("test")).toBe(false);
    });

    it("should handle case-sensitive backreferences", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.lit(" "))
        .then(RegexBuilder.backref("word"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("Hello Hello")).toBe(true);
      expect(regex.test("Hello hello")).toBe(false); // Case matters
    });
  });

  describe("AST Constructor", () => {
    it("should create BackrefNode with string target", () => {
      const node = backref("test");
      expect(node.type).toBe("backref");
      expect(node.target).toBe("test");
    });

    it("should create BackrefNode with number target", () => {
      const node = backref(1);
      expect(node.type).toBe("backref");
      expect(node.target).toBe(1);
    });
  });

  describe("Real-World Use Cases", () => {
    it("should detect doubled words (grammar checking)", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.whitespace().oneOrMore())
        .then(RegexBuilder.backref("word"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern, "gi");

      const text = "This is is a test with with doubled words";
      const matches = text.match(regex);
      expect(matches).toHaveLength(2);
      expect(matches?.[0]).toBe("is is");
      expect(matches?.[1]).toBe("with with");
    });

    it("should match balanced quotes", () => {
      const pattern = RegexBuilder.charClass("\"'")
        .capture("quote")
        .then(RegexBuilder.any().zeroOrMore())
        .then(RegexBuilder.backref("quote"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test('"hello"')).toBe(true);
      expect(regex.test("'hello'")).toBe(true);
      expect(regex.test("\"hello'")).toBe(false);
      expect(regex.test("'hello\"")).toBe(false);
    });

    it("should match palindrome patterns", () => {
      // Simple 3-character palindrome (e.g., "aba")
      const pattern = RegexBuilder.any()
        .capture("first")
        .then(RegexBuilder.any())
        .then(RegexBuilder.backref("first"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("aba")).toBe(true);
      expect(regex.test("121")).toBe(true);
      expect(regex.test("abc")).toBe(false);
    });
  });
});
