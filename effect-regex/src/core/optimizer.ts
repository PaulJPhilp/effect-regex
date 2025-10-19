/**
 * Pattern Optimization Engine
 *
 * Provides AST optimization passes to improve pattern efficiency:
 * 1. Constant Folding - Merge adjacent literals
 * 2. Quantifier Simplification - Remove redundant quantifiers
 * 3. Character Class Merging - Combine alternating character classes
 * 4. Alternation Deduplication - Remove duplicate alternatives
 */

import { Effect } from "effect";
import type { Ast as RegexAST } from "./ast.js";

/**
 * Optimization result with metrics
 */
export interface OptimizationResult {
  readonly optimized: RegexAST;
  readonly passesApplied: readonly string[];
  readonly nodesReduced: number;
  readonly beforeSize: number;
  readonly afterSize: number;
}

/**
 * Optimization configuration
 */
export interface OptimizationOptions {
  readonly constantFolding?: boolean;      // Default: true
  readonly quantifierSimplification?: boolean; // Default: true
  readonly characterClassMerging?: boolean; // Default: true
  readonly alternationDedup?: boolean;     // Default: true
  readonly maxPasses?: number;             // Default: 5
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  constantFolding: true,
  quantifierSimplification: true,
  characterClassMerging: true,
  alternationDedup: true,
  maxPasses: 5,
};

/**
 * Count AST nodes (for metrics)
 */
function countNodes(ast: RegexAST): number {
  switch (ast.type) {
    case "lit":
    case "raw":
    case "cls":
    case "anchor":
      return 1;

    case "seq":
    case "alt":
      return 1 + ast.children.reduce((sum, child) => sum + countNodes(child), 0);

    case "group":
    case "noncap":
      return 1 + countNodes(ast.child);

    case "q":
      return 1 + countNodes(ast.child);

    default:
      return 1;
  }
}

/**
 * Optimization Pass 1: Constant Folding
 * Merges adjacent literal nodes in sequences
 *
 * Example: seq(lit("hello"), lit(" "), lit("world")) → lit("hello world")
 */
function constantFolding(ast: RegexAST): RegexAST {
  switch (ast.type) {
    case "seq": {
      // Merge adjacent literals
      const merged: RegexAST[] = [];
      let currentLiteral = "";

      for (const child of ast.children) {
        const optimizedChild = constantFolding(child);

        if (optimizedChild.type === "lit") {
          currentLiteral += optimizedChild.value;
        } else {
          if (currentLiteral) {
            merged.push({ type: "lit", value: currentLiteral });
            currentLiteral = "";
          }
          merged.push(optimizedChild);
        }
      }

      // Don't forget remaining literal
      if (currentLiteral) {
        merged.push({ type: "lit", value: currentLiteral });
      }

      // If only one child remains, unwrap
      if (merged.length === 1) {
        return merged[0];
      }

      return { type: "seq", children: merged };
    }

    case "alt":
      return { type: "alt", children: ast.children.map(constantFolding) };

    case "group":
      return { type: "group", name: ast.name, child: constantFolding(ast.child) };

    case "noncap":
      return { type: "noncap", child: constantFolding(ast.child) };

    case "q":
      return { type: "q", child: constantFolding(ast.child), min: ast.min, max: ast.max, lazy: ast.lazy };

    default:
      return ast;
  }
}

/**
 * Optimization Pass 2: Quantifier Simplification
 * Removes redundant nested quantifiers
 *
 * Example: q(q(digit, 1, inf), 1, inf) → q(digit, 1, inf)
 */
function quantifierSimplification(ast: RegexAST): RegexAST {
  switch (ast.type) {
    case "q": {
      const optimizedChild = quantifierSimplification(ast.child);

      // If child is also a quantifier, merge them
      if (optimizedChild.type === "q") {
        const inner = optimizedChild;
        const outer = ast;

        // Calculate combined min/max
        const combinedMin = outer.min * inner.min;
        const combinedMax =
          outer.max === null || inner.max === null
            ? null
            : outer.max * inner.max;

        // Use outer's lazy preference
        return {
          type: "q",
          child: inner.child,
          min: combinedMin,
          max: combinedMax,
          lazy: outer.lazy,
        };
      }

      // Simplify {1,1} to no quantifier
      if (ast.min === 1 && ast.max === 1) {
        return optimizedChild;
      }

      return { type: "q", child: optimizedChild, min: ast.min, max: ast.max, lazy: ast.lazy };
    }

    case "seq":
      return { type: "seq", children: ast.children.map(quantifierSimplification) };

    case "alt":
      return { type: "alt", children: ast.children.map(quantifierSimplification) };

    case "group":
      return { type: "group", name: ast.name, child: quantifierSimplification(ast.child) };

    case "noncap":
      return { type: "noncap", child: quantifierSimplification(ast.child) };

    default:
      return ast;
  }
}

/**
 * Optimization Pass 3: Character Class Merging
 * Merges alternations of character classes into a single class
 *
 * Example: alt(cls("a-z"), cls("A-Z")) → cls("a-zA-Z")
 */
function characterClassMerging(ast: RegexAST): RegexAST {
  switch (ast.type) {
    case "alt": {
      const optimizedChildren = ast.children.map(characterClassMerging);

      // Find all character classes (non-negated)
      const charClasses: string[] = [];
      const nonCharClasses: RegexAST[] = [];

      for (const child of optimizedChildren) {
        if (child.type === "cls" && !child.negated) {
          charClasses.push(child.chars);
        } else {
          nonCharClasses.push(child);
        }
      }

      // If we have 2+ character classes, merge them
      if (charClasses.length >= 2) {
        const mergedChars = charClasses.join("");
        const merged: RegexAST = { type: "cls", chars: mergedChars, negated: false };

        const newChildren = [merged, ...nonCharClasses];

        if (newChildren.length === 1) {
          return newChildren[0];
        }

        return { type: "alt", children: newChildren };
      }

      return { type: "alt", children: optimizedChildren };
    }

    case "seq":
      return { type: "seq", children: ast.children.map(characterClassMerging) };

    case "group":
      return { type: "group", name: ast.name, child: characterClassMerging(ast.child) };

    case "noncap":
      return { type: "noncap", child: characterClassMerging(ast.child) };

    case "q":
      return { type: "q", child: characterClassMerging(ast.child), min: ast.min, max: ast.max, lazy: ast.lazy };

    default:
      return ast;
  }
}

/**
 * Optimization Pass 4: Alternation Deduplication
 * Removes duplicate alternatives
 *
 * Example: alt(lit("test"), lit("test"), lit("demo")) → alt(lit("demo"), lit("test"))
 */
function alternationDeduplication(ast: RegexAST): RegexAST {
  switch (ast.type) {
    case "alt": {
      const optimizedChildren = ast.children.map(alternationDeduplication);

      // Deduplicate by converting to JSON and using Set
      const seen = new Set<string>();
      const unique: RegexAST[] = [];

      for (const child of optimizedChildren) {
        const key = JSON.stringify(child);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(child);
        }
      }

      // If only one alternative remains, unwrap
      if (unique.length === 1) {
        return unique[0];
      }

      // Sort for deterministic output (already done by alt constructor, but ensure it)
      return { type: "alt", children: unique };
    }

    case "seq":
      return { type: "seq", children: ast.children.map(alternationDeduplication) };

    case "group":
      return { type: "group", name: ast.name, child: alternationDeduplication(ast.child) };

    case "noncap":
      return { type: "noncap", child: alternationDeduplication(ast.child) };

    case "q":
      return { type: "q", child: alternationDeduplication(ast.child), min: ast.min, max: ast.max, lazy: ast.lazy };

    default:
      return ast;
  }
}

/**
 * Apply a single optimization pass
 */
function applyPass(ast: RegexAST, passName: string): RegexAST {
  switch (passName) {
    case "constantFolding":
      return constantFolding(ast);
    case "quantifierSimplification":
      return quantifierSimplification(ast);
    case "characterClassMerging":
      return characterClassMerging(ast);
    case "alternationDedup":
      return alternationDeduplication(ast);
    default:
      return ast;
  }
}

/**
 * Check if two ASTs are equal (for fixed-point detection)
 */
function astEquals(a: RegexAST, b: RegexAST): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Optimize a regex AST with multiple passes until fixed point
 */
export function optimize(
  ast: RegexAST,
  options: OptimizationOptions = {}
): Effect.Effect<OptimizationResult, never, never> {
  return Effect.gen(function* () {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const passesApplied: string[] = [];
    const beforeSize = countNodes(ast);

    let current = ast;
    let iteration = 0;

    // Determine which passes to apply
    const passes: string[] = [];
    if (opts.constantFolding) passes.push("constantFolding");
    if (opts.quantifierSimplification) passes.push("quantifierSimplification");
    if (opts.characterClassMerging) passes.push("characterClassMerging");
    if (opts.alternationDedup) passes.push("alternationDedup");

    // Apply passes until fixed point or max iterations
    while (iteration < opts.maxPasses) {
      let changed = false;

      for (const passName of passes) {
        const next = applyPass(current, passName);

        if (!astEquals(current, next)) {
          current = next;
          changed = true;
          if (!passesApplied.includes(passName)) {
            passesApplied.push(passName);
          }
        }
      }

      if (!changed) {
        // Fixed point reached
        break;
      }

      iteration++;
    }

    const afterSize = countNodes(current);
    const nodesReduced = beforeSize - afterSize;

    return {
      optimized: current,
      passesApplied,
      nodesReduced,
      beforeSize,
      afterSize,
    };
  });
}

/**
 * Optimize with a single specific pass (for testing/debugging)
 */
export function optimizeWithPass(
  ast: RegexAST,
  passName: "constantFolding" | "quantifierSimplification" | "characterClassMerging" | "alternationDedup"
): RegexAST {
  return applyPass(ast, passName);
}
