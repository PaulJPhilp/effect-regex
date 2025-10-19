/**
 * Optimizer Tests
 * Tests for pattern optimization engine
 */

import { describe, it, expect } from "@effect/vitest";
import { Effect } from "effect";
import { optimize, optimizeWithPass } from "../src/core/optimizer.js";
import { RegexBuilder, emit } from "../src/core/builder.js";
import type { Ast as RegexAST } from "../src/core/ast.js";

describe("Optimizer - Constant Folding", () => {
  it("should merge adjacent literals in a sequence", () => {
    const pattern = RegexBuilder.lit("hello")
      .then(RegexBuilder.lit(" "))
      .then(RegexBuilder.lit("world"));

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "constantFolding");

    // Should be a single literal
    expect(optimized.type).toBe("lit");
    if (optimized.type === "lit") {
      expect(optimized.value).toBe("hello world");
    }
  });

  it("should merge multiple literals", () => {
    const pattern = RegexBuilder.lit("a")
      .then(RegexBuilder.lit("b"))
      .then(RegexBuilder.lit("c"))
      .then(RegexBuilder.lit("d"));

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "constantFolding");

    expect(optimized.type).toBe("lit");
    if (optimized.type === "lit") {
      expect(optimized.value).toBe("abcd");
    }
  });

  it("should not merge literals separated by other nodes", () => {
    const pattern = RegexBuilder.lit("hello")
      .then(RegexBuilder.digit())
      .then(RegexBuilder.lit("world"));

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "constantFolding");

    expect(optimized.type).toBe("seq");
    if (optimized.type === "seq") {
      expect(optimized.children.length).toBe(3);
      expect(optimized.children[0].type).toBe("lit");
      expect(optimized.children[1].type).toBe("cls");
      expect(optimized.children[2].type).toBe("lit");
    }
  });

  it("should handle nested sequences", () => {
    // Manually create nested sequence for testing
    const ast: RegexAST = {
      type: "seq",
      children: [
        { type: "lit", value: "a" },
        {
          type: "seq",
          children: [
            { type: "lit", value: "b" },
            { type: "lit", value: "c" },
          ],
        },
      ],
    };

    const optimized = optimizeWithPass(ast, "constantFolding");

    // All literals should be merged into one, and sequence unwrapped
    expect(optimized.type).toBe("lit");
    if (optimized.type === "lit") {
      expect(optimized.value).toBe("abc");
    }
  });
});

describe("Optimizer - Quantifier Simplification", () => {
  it("should merge nested quantifiers", () => {
    const pattern = RegexBuilder.digit().oneOrMore().oneOrMore();

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "quantifierSimplification");

    // Should be a single quantifier: {1,inf}
    expect(optimized.type).toBe("q");
    if (optimized.type === "q") {
      expect(optimized.min).toBe(1);
      expect(optimized.max).toBe(null);
      expect(optimized.child.type).toBe("cls");
    }
  });

  it("should multiply quantifier bounds", () => {
    // Manually create q(q(digit, 2, 3), 4, 5) → q(digit, 8, 15)
    const inner: RegexAST = {
      type: "q",
      child: { type: "cls", pattern: "0-9", negated: false },
      min: 2,
      max: 3,
      lazy: false,
    };

    const outer: RegexAST = {
      type: "q",
      child: inner,
      min: 4,
      max: 5,
      lazy: false,
    };

    const optimized = optimizeWithPass(outer, "quantifierSimplification");

    expect(optimized.type).toBe("q");
    if (optimized.type === "q") {
      expect(optimized.min).toBe(8);  // 2 * 4
      expect(optimized.max).toBe(15); // 3 * 5
      expect(optimized.child.type).toBe("cls");
    }
  });

  it("should handle infinite max correctly", () => {
    // q(q(digit, 1, null), 2, null) → q(digit, 2, null)
    const inner: RegexAST = {
      type: "q",
      child: { type: "cls", pattern: "0-9", negated: false },
      min: 1,
      max: null,
      lazy: false,
    };

    const outer: RegexAST = {
      type: "q",
      child: inner,
      min: 2,
      max: null,
      lazy: false,
    };

    const optimized = optimizeWithPass(outer, "quantifierSimplification");

    expect(optimized.type).toBe("q");
    if (optimized.type === "q") {
      expect(optimized.min).toBe(2);
      expect(optimized.max).toBe(null);
    }
  });

  it("should remove {1,1} quantifiers", () => {
    // Manually create q(digit, 1, 1) → digit
    const ast: RegexAST = {
      type: "q",
      child: { type: "cls", pattern: "0-9", negated: false },
      min: 1,
      max: 1,
      lazy: false,
    };

    const optimized = optimizeWithPass(ast, "quantifierSimplification");

    expect(optimized.type).toBe("cls");
  });

  it("should preserve lazy flag from outer quantifier", () => {
    const inner: RegexAST = {
      type: "q",
      child: { type: "cls", pattern: "0-9", negated: false },
      min: 1,
      max: null,
      lazy: false,
    };

    const outer: RegexAST = {
      type: "q",
      child: inner,
      min: 1,
      max: null,
      lazy: true, // Lazy
    };

    const optimized = optimizeWithPass(outer, "quantifierSimplification");

    expect(optimized.type).toBe("q");
    if (optimized.type === "q") {
      expect(optimized.lazy).toBe(true);
    }
  });
});

describe("Optimizer - Character Class Merging", () => {
  it("should merge alternating character classes", () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.charClass("a-z"),
      RegexBuilder.charClass("A-Z")
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "characterClassMerging");

    // Should be a single character class
    expect(optimized.type).toBe("cls");
    if (optimized.type === "cls") {
      expect(optimized.chars).toBe("a-zA-Z");
      expect(optimized.negated).toBe(false);
    }
  });

  it("should merge multiple character classes", () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.charClass("a-z"),
      RegexBuilder.charClass("A-Z"),
      RegexBuilder.charClass("0-9")
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "characterClassMerging");

    expect(optimized.type).toBe("cls");
    if (optimized.type === "cls") {
      // Order may vary due to alt() sorting, just check all parts are there
      expect(optimized.chars).toContain("a-z");
      expect(optimized.chars).toContain("A-Z");
      expect(optimized.chars).toContain("0-9");
    }
  });

  it("should not merge negated character classes", () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.charClass("a-z", true), // Negated
      RegexBuilder.charClass("A-Z")
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "characterClassMerging");

    // Should remain as alternation
    expect(optimized.type).toBe("alt");
    if (optimized.type === "alt") {
      expect(optimized.children.length).toBe(2);
    }
  });

  it("should keep non-character-class alternatives", () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.charClass("a-z"),
      RegexBuilder.lit("test"),
      RegexBuilder.charClass("A-Z")
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "characterClassMerging");

    expect(optimized.type).toBe("alt");
    if (optimized.type === "alt") {
      expect(optimized.children.length).toBe(2);
      // First should be merged character class
      expect(optimized.children[0].type).toBe("cls");
      // Second should be the literal
      expect(optimized.children[1].type).toBe("lit");
    }
  });
});

describe("Optimizer - Alternation Deduplication", () => {
  it("should remove duplicate alternatives", () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.lit("test"),
      RegexBuilder.lit("test"),
      RegexBuilder.lit("demo")
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "alternationDedup");

    expect(optimized.type).toBe("alt");
    if (optimized.type === "alt") {
      expect(optimized.children.length).toBe(2);

      // Check both alternatives are present (order may vary due to sorting)
      const values = optimized.children.map(c =>
        c.type === "lit" ? c.value : ""
      );
      expect(values).toContain("test");
      expect(values).toContain("demo");
    }
  });

  it("should unwrap single alternative", () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.lit("test"),
      RegexBuilder.lit("test")
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "alternationDedup");

    // Should unwrap to single literal
    expect(optimized.type).toBe("lit");
    if (optimized.type === "lit") {
      expect(optimized.value).toBe("test");
    }
  });

  it("should deduplicate complex patterns", () => {
    const complexPattern = RegexBuilder.digit().oneOrMore();

    const pattern = RegexBuilder.alt(
      complexPattern,
      RegexBuilder.lit("test"),
      complexPattern // Duplicate
    );

    const ast = pattern.getAst();
    const optimized = optimizeWithPass(ast, "alternationDedup");

    expect(optimized.type).toBe("alt");
    if (optimized.type === "alt") {
      expect(optimized.children.length).toBe(2);
    }
  });
});

describe("Optimizer - Full Optimization", () => {
  it("should apply all passes and report results", async () => {
    const pattern = RegexBuilder.lit("hello")
      .then(RegexBuilder.lit(" "))
      .then(RegexBuilder.lit("world"));

    const ast = pattern.getAst();
    const result = await Effect.runPromise(optimize(ast));

    expect(result.optimized.type).toBe("lit");
    expect(result.passesApplied).toContain("constantFolding");
    expect(result.nodesReduced).toBeGreaterThan(0);
    expect(result.afterSize).toBeLessThan(result.beforeSize);
  });

  it("should reach fixed point with multiple passes", async () => {
    // Create a pattern that benefits from multiple passes
    const pattern = RegexBuilder.alt(
      RegexBuilder.lit("a").then(RegexBuilder.lit("b")),
      RegexBuilder.lit("a").then(RegexBuilder.lit("b")),
      RegexBuilder.charClass("0-9"),
      RegexBuilder.charClass("a-z")
    );

    const ast = pattern.getAst();
    const result = await Effect.runPromise(optimize(ast));

    expect(result.passesApplied.length).toBeGreaterThan(0);
    expect(result.nodesReduced).toBeGreaterThan(0);

    // Check multiple passes were applied
    expect(result.passesApplied).toContain("constantFolding");
    expect(result.passesApplied).toContain("alternationDedup");
    expect(result.passesApplied).toContain("characterClassMerging");
  });

  it("should respect optimization options", async () => {
    const pattern = RegexBuilder.lit("hello")
      .then(RegexBuilder.lit(" "))
      .then(RegexBuilder.lit("world"));

    const ast = pattern.getAst();

    // Disable constant folding
    const result = await Effect.runPromise(
      optimize(ast, { constantFolding: false })
    );

    expect(result.passesApplied).not.toContain("constantFolding");
    expect(result.optimized.type).toBe("seq"); // Should remain as sequence
  });

  it("should not reduce already optimal patterns", async () => {
    const pattern = RegexBuilder.lit("test");

    const ast = pattern.getAst();
    const result = await Effect.runPromise(optimize(ast));

    expect(result.nodesReduced).toBe(0);
    expect(result.beforeSize).toBe(result.afterSize);
  });

  it("should preserve pattern semantics after optimization", async () => {
    const original = RegexBuilder.lit("hello")
      .then(RegexBuilder.lit(" "))
      .then(RegexBuilder.lit("world"));

    const ast = original.getAst();
    const result = await Effect.runPromise(optimize(ast));

    // Emit both and compare
    const originalEmitted = emit(original);
    const optimizedBuilder = new RegexBuilder(result.optimized);
    const optimizedEmitted = emit(optimizedBuilder);

    // Should produce the same regex
    expect(optimizedEmitted.pattern).toBe(originalEmitted.pattern);
  });

  it("should handle complex nested patterns", async () => {
    const pattern = RegexBuilder.alt(
      RegexBuilder.lit("a").then(RegexBuilder.lit("b")).oneOrMore().oneOrMore(),
      RegexBuilder.charClass("0-9"),
      RegexBuilder.charClass("a-z"),
      RegexBuilder.lit("a").then(RegexBuilder.lit("b")).oneOrMore().oneOrMore()
    );

    const ast = pattern.getAst();
    const result = await Effect.runPromise(optimize(ast));

    expect(result.nodesReduced).toBeGreaterThan(0);
    expect(result.passesApplied.length).toBeGreaterThan(1);
  });

  it("should report meaningful metrics", async () => {
    const pattern = RegexBuilder.lit("a")
      .then(RegexBuilder.lit("b"))
      .then(RegexBuilder.lit("c"))
      .then(RegexBuilder.lit("d"))
      .then(RegexBuilder.lit("e"));

    const ast = pattern.getAst();
    const result = await Effect.runPromise(optimize(ast));

    expect(result.beforeSize).toBeGreaterThan(result.afterSize);
    expect(result.nodesReduced).toBe(result.beforeSize - result.afterSize);
    expect(result.passesApplied).toContain("constantFolding");

    // Specific to this case: 5 literals merged into 1
    expect(result.afterSize).toBe(1);
    expect(result.beforeSize).toBeGreaterThan(4);
  });
});
