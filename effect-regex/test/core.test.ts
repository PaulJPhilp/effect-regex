import { describe, expect, it } from "@effect/vitest";
import { emit, RegexBuilder } from "../src/core/builder.js";
import { STANDARD_PATTERNS } from "../src/std/patterns.js";

describe("Core Builder", () => {
  it("should create simple literal patterns", () => {
    const builder = RegexBuilder.lit("hello");
    const result = emit(builder);

    expect(result.pattern).toBe("hello");
    expect(result.notes).toEqual([]);
  });

  it("should create character classes", () => {
    const builder = RegexBuilder.charClass("a-z");
    const result = emit(builder);

    expect(result.pattern).toBe("[a-z]");
  });

  it("should create negated character classes", () => {
    const builder = RegexBuilder.charClass("aeiou", true);
    const result = emit(builder);

    expect(result.pattern).toBe("[^aeiou]");
  });

  it("should handle sequences", () => {
    const builder = RegexBuilder.lit("hello").then(" ").then("world");
    const result = emit(builder);

    expect(result.pattern).toBe("hello world");
  });

  it("should handle alternatives deterministically", () => {
    const builder = RegexBuilder.lit("zebra").or("apple").or("banana");
    const result = emit(builder);

    expect(result.pattern).toBe("apple|banana|zebra"); // Should be sorted
  });

  it("should create non-capturing groups by default", () => {
    const builder = RegexBuilder.lit("hello").group();
    const result = emit(builder);

    expect(result.pattern).toBe("(?:hello)");
  });

  it("should create capturing groups when requested", () => {
    const builder = RegexBuilder.lit("hello").capture();
    const result = emit(builder);

    expect(result.pattern).toBe("(hello)");
  });

  it("should handle quantifiers", () => {
    const builder = RegexBuilder.lit("a").zeroOrMore();
    const result = emit(builder);

    expect(result.pattern).toBe("a*");
  });

  it("should handle lazy quantifiers", () => {
    const builder = RegexBuilder.lit("a").oneOrMore(true);
    const result = emit(builder);

    expect(result.pattern).toBe("a+?");
  });

  it("should handle anchors", () => {
    const builder = RegexBuilder.lit("hello").startOfLine().endOfLine();
    const result = emit(builder, "js", false);

    expect(result.pattern).toBe("^hello$");
  });

  it("should add anchors when requested", () => {
    const builder = RegexBuilder.lit("hello");
    const result = emit(builder, "js", true);

    expect(result.pattern).toBe("^hello$");
  });
});

describe("Standard Library", () => {
  it("should emit quotedString pattern", () => {
    const pattern = STANDARD_PATTERNS.quotedString.pattern;
    const result = emit(pattern, "re2"); // Test with RE2 to get dialect notes

    expect(result.pattern).toBeDefined();
    expect(result.notes).toContain(
      "No named groups",
      "No lookbehind",
      "No backreferences"
    );
  });

  it("should emit integer pattern", () => {
    const pattern = STANDARD_PATTERNS.integer.pattern;
    const result = emit(pattern);

    expect(result.pattern).toBeDefined();
    expect(result.captureMap).toHaveProperty("int");
  });

  it("should emit keyValue pattern", () => {
    const pattern = STANDARD_PATTERNS.keyValue.pattern;
    const result = emit(pattern);

    expect(result.pattern).toBeDefined();
    expect(result.captureMap).toHaveProperty("kv");
  });
});

describe("Dialect Support", () => {
  it("should emit JS-compatible patterns by default", () => {
    const builder = RegexBuilder.lit("test").capture("name");
    const result = emit(builder, "js");

    expect(result.pattern).toBe("(?<name>test)");
  });

  it("should downgrade named groups for RE2", () => {
    const builder = RegexBuilder.lit("test").capture("name");
    const result = emit(builder, "re2");

    expect(result.pattern).toBe("(test)");
    expect(result.notes).toContain(
      'Named group "name" downgraded to numbered group 1 for RE2'
    );
  });
});
