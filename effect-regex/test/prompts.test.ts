import { describe, expect, it } from "vitest";
import {
  generateProposalPrompt,
  generateRefinementPrompt,
  parseRegexBuilderCode,
  validateRegexBuilderCode,
} from "../src/ai/prompts.js";

describe("Prompts Module", () => {
  describe("generateProposalPrompt", () => {
    it("should generate prompt with positive examples", () => {
      const prompt = generateProposalPrompt(["hello", "world"], [], undefined);

      expect(prompt).toContain("MUST MATCH");
      expect(prompt).toContain('"hello"');
      expect(prompt).toContain('"world"');
      expect(prompt).toContain("RegexBuilder");
    });

    it("should generate prompt with negative examples", () => {
      const prompt = generateProposalPrompt([], ["bad1", "bad2"], undefined);

      expect(prompt).toContain("MUST NOT MATCH");
      expect(prompt).toContain('"bad1"');
      expect(prompt).toContain('"bad2"');
    });

    it("should generate prompt with context", () => {
      const prompt = generateProposalPrompt(["test"], [], "email addresses");

      expect(prompt).toContain("Context");
      expect(prompt).toContain("email addresses");
    });

    it("should generate prompt with all components", () => {
      const prompt = generateProposalPrompt(
        ["user@example.com", "test@test.org"],
        ["@example.com", "not-email"],
        "email addresses"
      );

      expect(prompt).toContain("MUST MATCH");
      expect(prompt).toContain("user@example.com");
      expect(prompt).toContain("test@test.org");
      expect(prompt).toContain("MUST NOT MATCH");
      expect(prompt).toContain("@example.com");
      expect(prompt).toContain("not-email");
      expect(prompt).toContain("Context");
      expect(prompt).toContain("email addresses");
      expect(prompt).toContain("RegexBuilder API");
    });

    it("should include API documentation", () => {
      const prompt = generateProposalPrompt(["test"], [], undefined);

      expect(prompt).toContain(".lit(");
      expect(prompt).toContain(".digit()");
      expect(prompt).toContain(".oneOrMore()");
      expect(prompt).toContain(".capture(");
    });

    it("should include requirements", () => {
      const prompt = generateProposalPrompt(["test"], [], undefined);

      expect(prompt).toContain("Requirements");
      expect(prompt).toContain("catastrophic backtracking");
      expect(prompt).toContain("Response Format");
    });
  });

  describe("generateRefinementPrompt", () => {
    it("should generate refinement prompt with failed tests", () => {
      const prompt = generateRefinementPrompt(
        "RegexBuilder.lit('test').oneOrMore()",
        [
          {
            input: "test123",
            shouldMatch: true,
            actuallyMatched: false,
          },
          {
            input: "bad",
            shouldMatch: false,
            actuallyMatched: true,
          },
        ],
        "Pattern for test strings"
      );

      expect(prompt).toContain("previously generated");
      expect(prompt).toContain("RegexBuilder.lit('test').oneOrMore()");
      expect(prompt).toContain("Pattern for test strings");
      expect(prompt).toContain('"test123"');
      expect(prompt).toContain('"bad"');
      expect(prompt).toContain("Expected: MATCH");
      expect(prompt).toContain("Expected: NO MATCH");
      expect(prompt).toContain("Actual: NO MATCH");
      expect(prompt).toContain("Actual: MATCHED");
    });

    it("should explain when pattern is too restrictive", () => {
      const prompt = generateRefinementPrompt(
        "RegexBuilder.lit('test')",
        [
          {
            input: "testing",
            shouldMatch: true,
            actuallyMatched: false,
          },
        ],
        "Test pattern"
      );

      expect(prompt).toContain("too restrictive");
      expect(prompt).toContain("should match but doesn't");
    });

    it("should explain when pattern is too permissive", () => {
      const prompt = generateRefinementPrompt(
        "RegexBuilder.any().oneOrMore()",
        [
          {
            input: "bad",
            shouldMatch: false,
            actuallyMatched: true,
          },
        ],
        "Strict pattern"
      );

      expect(prompt).toContain("too permissive");
      expect(prompt).toContain("shouldn't match but does");
    });

    it("should include guidelines", () => {
      const prompt = generateRefinementPrompt(
        "RegexBuilder.lit('test')",
        [
          {
            input: "test",
            shouldMatch: true,
            actuallyMatched: false,
          },
        ],
        "Test"
      );

      expect(prompt).toContain("Guidelines");
      expect(prompt).toContain("minimal changes");
      expect(prompt).toContain("readability");
    });
  });

  describe("parseRegexBuilderCode", () => {
    it("should extract code from typescript code blocks", () => {
      const response = `Here's the pattern:

\`\`\`typescript
RegexBuilder.lit('test').oneOrMore()
\`\`\`

That should work!`;

      const code = parseRegexBuilderCode(response);
      expect(code).toBe("RegexBuilder.lit('test').oneOrMore()");
    });

    it("should extract code from ts code blocks", () => {
      const response = `\`\`\`ts
RegexBuilder.digit().exactly(3)
\`\`\``;

      const code = parseRegexBuilderCode(response);
      expect(code).toBe("RegexBuilder.digit().exactly(3)");
    });

    it("should extract code from plain code blocks", () => {
      const response = `\`\`\`
RegexBuilder.word().oneOrMore()
\`\`\``;

      const code = parseRegexBuilderCode(response);
      expect(code).toBe("RegexBuilder.word().oneOrMore()");
    });

    it("should extract RegexBuilder pattern without code blocks", () => {
      const response = `RegexBuilder.charClass("a-z").oneOrMore().capture("word")

This pattern matches lowercase words.`;

      const code = parseRegexBuilderCode(response);
      expect(code).toBe(
        'RegexBuilder.charClass("a-z").oneOrMore().capture("word")'
      );
    });

    it("should return full response if it contains RegexBuilder", () => {
      const response = "RegexBuilder.lit('simple')";

      const code = parseRegexBuilderCode(response);
      expect(code).toBe("RegexBuilder.lit('simple')");
    });

    it("should return null if no RegexBuilder found", () => {
      const response = "This is just plain text without any regex code.";

      const code = parseRegexBuilderCode(response);
      expect(code).toBeNull();
    });

    it("should handle multi-line code blocks", () => {
      const response = `\`\`\`typescript
RegexBuilder
  .lit("test")
  .then(RegexBuilder.digit().oneOrMore())
  .capture("result")
\`\`\``;

      const code = parseRegexBuilderCode(response);
      expect(code).toContain("RegexBuilder");
      expect(code).toContain('.lit("test")');
      expect(code).toContain('.capture("result")');
    });
  });

  describe("validateRegexBuilderCode", () => {
    it("should validate code with RegexBuilder.lit", () => {
      const code = "RegexBuilder.lit('test')";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with method chains", () => {
      const code =
        "RegexBuilder.digit().oneOrMore().then(RegexBuilder.lit('@')).capture('email')";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should reject code without RegexBuilder", () => {
      const code = "const pattern = /test/";
      expect(validateRegexBuilderCode(code)).toBe(false);
    });

    it("should reject code with eval", () => {
      const code = "RegexBuilder.lit('test'); eval('malicious code')";
      expect(validateRegexBuilderCode(code)).toBe(false);
    });

    it("should reject code with Function constructor", () => {
      const code = "RegexBuilder.lit('test'); new Function('return evil')()";
      expect(validateRegexBuilderCode(code)).toBe(false);
    });

    it("should validate code with digit method", () => {
      const code = "RegexBuilder.digit().exactly(3)";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with word method", () => {
      const code = "RegexBuilder.word().oneOrMore()";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with charClass method", () => {
      const code = "RegexBuilder.charClass('a-z0-9').oneOrMore()";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with alt method", () => {
      const code =
        "RegexBuilder.alt(RegexBuilder.lit('a'), RegexBuilder.lit('b'))";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with anchors", () => {
      const code =
        "RegexBuilder.startOfLine().then(RegexBuilder.word()).endOfLine()";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with groups", () => {
      const code = "RegexBuilder.lit('test').group().capture('name')";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with quantifiers", () => {
      const code =
        "RegexBuilder.digit().between(2, 4).optional().zeroOrMore().atLeast(1)";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should reject code with only RegexBuilder but no methods", () => {
      const code = "RegexBuilder";
      expect(validateRegexBuilderCode(code)).toBe(false);
    });

    it("should validate code with raw method", () => {
      const code = "RegexBuilder.raw('\\\\d+')";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with whitespace method", () => {
      const code = "RegexBuilder.whitespace().oneOrMore()";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with any method", () => {
      const code = "RegexBuilder.any().zeroOrMore()";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });

    it("should validate code with wordBoundary method", () => {
      const code = "RegexBuilder.lit('word').wordBoundary()";
      expect(validateRegexBuilderCode(code)).toBe(true);
    });
  });
});
