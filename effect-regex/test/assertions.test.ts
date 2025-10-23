/**
 * Assertion Tests
 * Tests for lookahead and lookbehind assertion AST nodes and RegexBuilder API
 */

import { describe, expect, it } from "@effect/vitest";
import {
  lookahead,
  lookbehind,
  negativeLookahead,
  negativeLookbehind,
} from "../src/core/ast.js";
import { emit, RegexBuilder } from "../src/core/builder.js";

describe("Assertions", () => {
  describe("Positive Lookahead", () => {
    it("should create positive lookahead pattern", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lookahead(RegexBuilder.digit()));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("[a-zA-Z0-9_]+(?=[0-9])");
    });

    it("should match pattern only if followed by assertion", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lookahead(RegexBuilder.digit()));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("test123")).toBe(true); // Matches "test"
      expect(regex.test("test")).toBe(false); // No digit after
      expect(regex.test("123test")).toBe(true); // Matches "23" followed by "t"
    });

    it("should not consume characters in lookahead", () => {
      const pattern = RegexBuilder.charClass("a-z")
        .oneOrMore()
        .capture("word")
        .then(RegexBuilder.lookahead(RegexBuilder.digit()));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);
      const match = "test123".match(regex);

      expect(match?.[1]).toBe("test"); // Captured group is just "test"
      expect(match?.[0]).toBe("test"); // Full match doesn't include the digit
    });
  });

  describe("Negative Lookahead", () => {
    it("should create negative lookahead pattern", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.negativeLookahead(RegexBuilder.digit()));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("[a-zA-Z0-9_]+(?![0-9])");
    });

    it("should match pattern only if NOT followed by assertion", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.negativeLookahead(RegexBuilder.digit()));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("test")).toBe(true); // No digit after
      expect(regex.test("test ")).toBe(true); // Space after
      expect(regex.test("test123")).toBe(true); // Matches "test12" (not followed by digit at end)
    });

    it("should exclude specific domains in email", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lit("@"))
        .then(
          RegexBuilder.negativeLookahead(
            RegexBuilder.alt(
              RegexBuilder.lit("tempmail"),
              RegexBuilder.lit("throwaway")
            )
          )
        )
        .then(RegexBuilder.word().oneOrMore());

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("user@example")).toBe(true);
      expect(regex.test("user@tempmail")).toBe(false);
      expect(regex.test("user@throwaway")).toBe(false);
    });
  });

  describe("Positive Lookbehind", () => {
    it("should create positive lookbehind pattern", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<=\\$)[0-9]+");
    });

    it("should match pattern only if preceded by assertion", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("$100")).toBe(true); // Preceded by $
      expect(regex.test("100")).toBe(false); // No $ before
      expect(regex.test("USD100")).toBe(false); // USD before
    });

    it("should not consume characters in lookbehind", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"))
        .capture("amount");

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);
      const match = "$100".match(regex);

      expect(match?.[1]).toBe("100"); // Captured group is just "100"
      expect(match?.[0]).toBe("100"); // Full match doesn't include $
    });
  });

  describe("Negative Lookbehind", () => {
    it("should create negative lookbehind pattern", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .negativeLookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "js");
      expect(result.pattern).toBe("(?<!\\$)[0-9]+");
    });

    it("should match pattern only if NOT preceded by assertion", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .negativeLookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("100")).toBe(true); // No $ before
      expect(regex.test("USD100")).toBe(true); // USD before (not $)
      expect(regex.test("$100")).toBe(true); // Matches "10" and "00" (not preceded by $)
    });
  });

  describe("Dialect Support", () => {
    it("should warn for RE2 lookbehind", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "re2");
      expect(result.notes).toContain("lookbehind not supported in RE2 dialect");
      expect(result.pattern).toContain("__LOOKBEHIND_UNSUPPORTED__");
    });

    it("should warn for RE2 negative lookbehind", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .negativeLookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "re2");
      expect(result.notes).toContain(
        "negative-lookbehind not supported in RE2 dialect"
      );
      expect(result.pattern).toContain("__NEGATIVE_LOOKBEHIND_UNSUPPORTED__");
    });

    it("should work for lookahead in RE2 dialect", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lookahead(RegexBuilder.digit()));

      const result = emit(pattern, "re2");
      expect(result.notes).not.toContain("lookahead");
      expect(result.pattern).toBe("[a-zA-Z0-9_]+(?=[0-9])");
    });

    it("should work for negative lookahead in RE2 dialect", () => {
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.negativeLookahead(RegexBuilder.digit()));

      const result = emit(pattern, "re2");
      expect(result.notes).not.toContain("negative-lookahead");
      expect(result.pattern).toBe("[a-zA-Z0-9_]+(?![0-9])");
    });

    it("should work for all assertions in JS dialect", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "js");
      expect(
        result.notes.filter((n) => n.includes("not supported"))
      ).toHaveLength(0);
      expect(result.pattern).toBe("(?<=\\$)[0-9]+");
    });

    it("should work for all assertions in PCRE dialect", () => {
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"));

      const result = emit(pattern, "pcre");
      expect(
        result.notes.filter((n) => n.includes("not supported"))
      ).toHaveLength(0);
      expect(result.pattern).toBe("(?<=\\$)[0-9]+");
    });
  });

  describe("Complex Assertions", () => {
    it("should handle multiple lookaheads (password validation)", () => {
      // Password must contain digit, lowercase, uppercase
      const pattern = RegexBuilder.lookahead(
        RegexBuilder.any().zeroOrMore().then(RegexBuilder.digit())
      )
        .then(
          RegexBuilder.lookahead(
            RegexBuilder.any().zeroOrMore().then(RegexBuilder.charClass("a-z"))
          )
        )
        .then(
          RegexBuilder.lookahead(
            RegexBuilder.any().zeroOrMore().then(RegexBuilder.charClass("A-Z"))
          )
        )
        .then(RegexBuilder.any().atLeast(8));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("Abc123xyz")).toBe(true); // All requirements
      expect(regex.test("abc123xyz")).toBe(false); // No uppercase
      expect(regex.test("ABC123XYZ")).toBe(false); // No lowercase
      expect(regex.test("Abcdefgh")).toBe(false); // No digit
      expect(regex.test("Abc123")).toBe(false); // Too short
    });

    it("should combine lookahead and lookbehind", () => {
      // Match number that's after $ and before a space
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"))
        .then(RegexBuilder.lookahead(RegexBuilder.lit(" ")));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("$100 USD")).toBe(true);
      expect(regex.test("$100")).toBe(false); // No space after
      expect(regex.test("100 USD")).toBe(false); // No $ before
    });

    it("should handle assertions in alternations", () => {
      const pattern = RegexBuilder.alt(
        RegexBuilder.word()
          .oneOrMore()
          .then(RegexBuilder.lookahead(RegexBuilder.digit())),
        RegexBuilder.digit().oneOrMore().lookbehind(RegexBuilder.lit("$"))
      );

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("test123")).toBe(true); // First alternative
      expect(regex.test("$100")).toBe(true); // Second alternative
      expect(regex.test("test")).toBe(false); // Neither
    });

    it("should handle nested assertions", () => {
      // Match word that's preceded by @ and not followed by .com
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("@"))
        .then(RegexBuilder.negativeLookahead(RegexBuilder.lit(".com")));

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("@example.org")).toBe(true);
      expect(regex.test("@example.com")).toBe(true); // Matches "exampl" (not followed by ".com")
      expect(regex.test("example.org")).toBe(false);
    });
  });

  describe("AST Constructors", () => {
    it("should create lookahead node", () => {
      const node = lookahead(lookahead({ type: "lit", value: "test" }));
      expect(node.type).toBe("assertion");
      expect(node.kind).toBe("lookahead");
    });

    it("should create negative lookahead node", () => {
      const node = negativeLookahead({ type: "lit", value: "test" });
      expect(node.type).toBe("assertion");
      expect(node.kind).toBe("negative-lookahead");
    });

    it("should create lookbehind node", () => {
      const node = lookbehind({ type: "lit", value: "test" });
      expect(node.type).toBe("assertion");
      expect(node.kind).toBe("lookbehind");
    });

    it("should create negative lookbehind node", () => {
      const node = negativeLookbehind({ type: "lit", value: "test" });
      expect(node.type).toBe("assertion");
      expect(node.kind).toBe("negative-lookbehind");
    });
  });

  describe("Real-World Use Cases", () => {
    it("should validate password requirements", () => {
      // At least 8 chars, 1 digit, 1 lowercase, 1 uppercase
      const pattern = RegexBuilder.lookahead(
        RegexBuilder.any().zeroOrMore().then(RegexBuilder.digit())
      )
        .then(
          RegexBuilder.lookahead(
            RegexBuilder.any().zeroOrMore().then(RegexBuilder.charClass("a-z"))
          )
        )
        .then(
          RegexBuilder.lookahead(
            RegexBuilder.any().zeroOrMore().then(RegexBuilder.charClass("A-Z"))
          )
        )
        .then(RegexBuilder.any().atLeast(8))
        .startOfLine()
        .endOfLine();

      const result = emit(pattern, "js", true);
      const regex = new RegExp(result.pattern);

      expect(regex.test("MyPass123")).toBe(true);
      expect(regex.test("Secure#45")).toBe(true);
      expect(regex.test("weak")).toBe(false);
      expect(regex.test("NoDigits")).toBe(false);
      expect(regex.test("no_uppercase_123")).toBe(false);
    });

    it("should match currency with lookbehind", () => {
      // Match price amounts (numbers after $)
      const pattern = RegexBuilder.digit()
        .oneOrMore()
        .lookbehind(RegexBuilder.lit("$"))
        .then(
          RegexBuilder.lit(".")
            .then(RegexBuilder.digit().exactly(2))
            .group()
            .optional()
        )
        .capture("price");

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern, "g");

      const text = "Items: $19.99, $5, $100.50";
      const matches = text.match(regex);
      expect(matches).toHaveLength(3);
      expect(matches?.[0]).toBe("19.99");
      expect(matches?.[1]).toBe("5");
      expect(matches?.[2]).toBe("100.50");
    });

    it("should match file extensions with negative lookahead", () => {
      // Match filenames but exclude .tmp and .bak
      const pattern = RegexBuilder.word()
        .oneOrMore()
        .then(RegexBuilder.lit("."))
        .then(
          RegexBuilder.negativeLookahead(
            RegexBuilder.alt(RegexBuilder.lit("tmp"), RegexBuilder.lit("bak"))
          )
        )
        .then(RegexBuilder.word().oneOrMore());

      const result = emit(pattern, "js");
      const regex = new RegExp(result.pattern);

      expect(regex.test("file.txt")).toBe(true);
      expect(regex.test("doc.pdf")).toBe(true);
      expect(regex.test("file.tmp")).toBe(false);
      expect(regex.test("backup.bak")).toBe(false);
    });
  });
});
