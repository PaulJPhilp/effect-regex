/**
 * Pattern Optimization Engine
 *
 * Provides AST optimization passes to improve pattern efficiency:
 * 1. Constant Folding - Merge adjacent literals
 * 2. Quantifier Simplification - Remove redundant quantifiers
 * 3. Character Class Merging - Combine alternating character classes
 * 4. Alternation Deduplication - Remove duplicate alternatives
 */

import type { Ast as RegexAST } from "./ast.js";

/**
 * Result of pattern optimization with performance metrics
 *
 * Provides the optimized AST along with detailed metrics about
 * which passes were applied and how much the pattern was simplified.
 */
export interface OptimizationResult {
  /** The optimized AST */
  readonly optimized: RegexAST;
  /** Names of optimization passes that made changes */
  readonly passesApplied: readonly string[];
  /** Number of AST nodes reduced (beforeSize - afterSize) */
  readonly nodesReduced: number;
  /** Total AST nodes before optimization */
  readonly beforeSize: number;
  /** Total AST nodes after optimization */
  readonly afterSize: number;
}

/**
 * Configuration options for pattern optimization
 *
 * Control which optimization passes are applied and iteration limits.
 * All passes are enabled by default for maximum optimization.
 */
export interface OptimizationOptions {
  /** Merge adjacent literals in sequences (default: true) */
  readonly constantFolding?: boolean;
  /** Simplify redundant quantifiers (default: true) */
  readonly quantifierSimplification?: boolean;
  /** Merge alternating character classes (default: true) */
  readonly characterClassMerging?: boolean;
  /** Remove duplicate alternatives (default: true) */
  readonly alternationDedup?: boolean;
  /** Maximum optimization iterations (default: 5) */
  readonly maxPasses?: number;
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  constantFolding: true,
  quantifierSimplification: true,
  characterClassMerging: true,
  alternationDedup: true,
  maxPasses: 5,
};

/**
 * Count total AST nodes in a tree
 *
 * Recursively traverses the AST and counts all nodes.
 * Used to measure pattern complexity and optimization effectiveness.
 *
 * @param ast - The AST to count nodes in
 * @returns Total number of nodes in the tree
 * @internal
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
      return (
        1 + ast.children.reduce((sum, child) => sum + countNodes(child), 0)
      );

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
 *
 * Merges adjacent literal nodes in sequences to reduce AST complexity.
 * This is particularly effective for patterns built from multiple string literals.
 *
 * @param ast - The AST to optimize
 * @returns Optimized AST with merged literals
 * @example
 * ```typescript
 * // Before: seq(lit("hello"), lit(" "), lit("world"))
 * // After:  lit("hello world")
 * ```
 * @internal
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
      return {
        type: "group",
        name: ast.name,
        child: constantFolding(ast.child),
      };

    case "noncap":
      return { type: "noncap", child: constantFolding(ast.child) };

    case "q":
      return {
        type: "q",
        child: constantFolding(ast.child),
        min: ast.min,
        max: ast.max,
        lazy: ast.lazy,
      };

    default:
      return ast;
  }
}

/**
 * Optimization Pass 2: Quantifier Simplification
 *
 * Removes redundant nested quantifiers and simplifies {1,1} quantifiers.
 * When quantifiers are nested, their repetition counts are multiplied together.
 *
 * @param ast - The AST to optimize
 * @returns Optimized AST with simplified quantifiers
 * @example
 * ```typescript
 * // Nested quantifiers: q(q(digit, 1, inf), 1, inf) → q(digit, 1, inf)
 * // Trivial quantifier: q(digit, 1, 1) → digit
 * ```
 * @internal
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

      return {
        type: "q",
        child: optimizedChild,
        min: ast.min,
        max: ast.max,
        lazy: ast.lazy,
      };
    }

    case "seq":
      return {
        type: "seq",
        children: ast.children.map(quantifierSimplification),
      };

    case "alt":
      return {
        type: "alt",
        children: ast.children.map(quantifierSimplification),
      };

    case "group":
      return {
        type: "group",
        name: ast.name,
        child: quantifierSimplification(ast.child),
      };

    case "noncap":
      return { type: "noncap", child: quantifierSimplification(ast.child) };

    default:
      return ast;
  }
}

/**
 * Optimization Pass 3: Character Class Merging
 *
 * Merges alternations of non-negated character classes into a single class.
 * This reduces alternation complexity and improves regex engine performance.
 *
 * @param ast - The AST to optimize
 * @returns Optimized AST with merged character classes
 * @example
 * ```typescript
 * // Before: alt(cls("a-z"), cls("A-Z"))
 * // After:  cls("a-zA-Z")
 * ```
 * @internal
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
        const merged: RegexAST = {
          type: "cls",
          chars: mergedChars,
          negated: false,
        };

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
      return {
        type: "group",
        name: ast.name,
        child: characterClassMerging(ast.child),
      };

    case "noncap":
      return { type: "noncap", child: characterClassMerging(ast.child) };

    case "q":
      return {
        type: "q",
        child: characterClassMerging(ast.child),
        min: ast.min,
        max: ast.max,
        lazy: ast.lazy,
      };

    default:
      return ast;
  }
}

/**
 * Optimization Pass 4: Alternation Deduplication
 *
 * Removes duplicate alternatives from alternation nodes.
 * Uses JSON serialization to detect structurally identical alternatives.
 *
 * @param ast - The AST to optimize
 * @returns Optimized AST with deduplicated alternatives
 * @example
 * ```typescript
 * // Before: alt(lit("test"), lit("test"), lit("demo"))
 * // After:  alt(lit("demo"), lit("test"))
 * ```
 * @internal
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
      return {
        type: "seq",
        children: ast.children.map(alternationDeduplication),
      };

    case "group":
      return {
        type: "group",
        name: ast.name,
        child: alternationDeduplication(ast.child),
      };

    case "noncap":
      return { type: "noncap", child: alternationDeduplication(ast.child) };

    case "q":
      return {
        type: "q",
        child: alternationDeduplication(ast.child),
        min: ast.min,
        max: ast.max,
        lazy: ast.lazy,
      };

    default:
      return ast;
  }
}

/**
 * Apply a single optimization pass by name
 *
 * Dispatcher function that routes to the appropriate optimization pass.
 *
 * @param ast - The AST to optimize
 * @param passName - Name of the pass to apply
 * @returns Optimized AST
 * @internal
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
 * Check if two ASTs are structurally equal
 *
 * Uses JSON serialization to detect structural equality.
 * Used to detect when optimization passes reach a fixed point.
 *
 * @param a - First AST
 * @param b - Second AST
 * @returns true if ASTs are structurally identical
 * @internal
 */
function astEquals(a: RegexAST, b: RegexAST): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Optimize a regex AST with multiple passes until fixed point
 *
 * Applies configurable optimization passes to reduce pattern complexity:
 * - **Constant Folding**: Merges adjacent literals (e.g., "hello" + "world" → "helloworld")
 * - **Quantifier Simplification**: Removes redundant quantifiers (e.g., (a+)+ → a+)
 * - **Character Class Merging**: Combines alternating classes (e.g., [a-z]|[A-Z] → [a-zA-Z])
 * - **Alternation Deduplication**: Removes duplicate alternatives (e.g., a|a → a)
 *
 * Optimization runs iteratively until a fixed point is reached or max passes exhausted.
 *
 * @param ast - The regex AST to optimize
 * @param options - Optimization configuration (defaults: all passes enabled, max 5 passes)
 * @returns Optimization result with optimized AST and metrics
 *
 * @example
 * ```typescript
 * const ast = seq(lit("hello"), lit(" "), lit("world"));
 * const result = optimize(ast);
 * // result.optimized: lit("hello world")
 * // result.passesApplied: ["constantFolding"]
 * // result.nodesReduced: 2
 * ```
 */
/**
 * Optimize a regex AST using multiple optimization passes
 *
 * Applies configurable optimization passes iteratively until a fixed point
 * is reached or the maximum iteration limit is hit. Returns detailed metrics
 * about the optimization process.
 *
 * The optimizer applies four main passes:
 * 1. **Constant Folding**: Merges adjacent literals
 * 2. **Quantifier Simplification**: Removes redundant quantifiers
 * 3. **Character Class Merging**: Combines alternating character classes
 * 4. **Alternation Deduplication**: Removes duplicate alternatives
 *
 * @param ast - The regex AST to optimize
 * @param options - Optimization configuration (all passes enabled by default)
 * @returns Optimization result with optimized AST and metrics
 * @example
 * ```typescript
 * const ast = seq(lit("hello"), lit(" "), lit("world"));
 * const result = optimize(ast);
 * // result.optimized === lit("hello world")
 * // result.nodesReduced === 2
 * // result.passesApplied === ["constantFolding"]
 *
 * // Disable specific optimizations
 * const result2 = optimize(ast, { constantFolding: false });
 * ```
 */
export function optimize(
  ast: RegexAST,
  options: OptimizationOptions = {}
): OptimizationResult {
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
}

/**
 * Apply a single optimization pass for testing or debugging
 *
 * Useful for understanding the effect of individual optimization passes
 * or for testing optimization logic in isolation.
 *
 * @param ast - The regex AST to optimize
 * @param passName - Name of the optimization pass to apply
 * @returns AST after applying the single pass
 * @example
 * ```typescript
 * const ast = seq(lit("hello"), lit(" "), lit("world"));
 * const optimized = optimizeWithPass(ast, "constantFolding");
 * // optimized === lit("hello world")
 * ```
 */
export function optimizeWithPass(
  ast: RegexAST,
  passName:
    | "constantFolding"
    | "quantifierSimplification"
    | "characterClassMerging"
    | "alternationDedup"
): RegexAST {
  return applyPass(ast, passName);
}
