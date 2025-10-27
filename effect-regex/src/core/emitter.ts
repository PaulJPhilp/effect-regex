/**
 * Pattern emitter - converts AST to regex strings for different dialects
 *
 * This module handles the compilation of AST nodes into concrete regex patterns,
 * with support for multiple regex dialects (JavaScript, RE2, PCRE). It manages
 * capture group numbering, dialect compatibility checking, and optimization.
 *
 * @module core/emitter
 */

import type { Ast } from "./ast.js";
import type { RegexBuilder, RegexPattern } from "./builder.js";

/**
 * Supported regex dialects
 *
 * - **js**: JavaScript RegExp (full feature support)
 * - **re2**: Google RE2 (limited features, linear time guarantee)
 * - **pcre**: Perl Compatible Regular Expressions (full feature support)
 */
export type Dialect = "js" | "re2" | "pcre";

/**
 * Information about dialect capabilities and limitations
 *
 * Each dialect has different feature support and constraints.
 * This helps emit dialect-compatible patterns and warn about unsupported features.
 */
interface DialectInfo {
  /** Whether the dialect supports named capture groups like (?<name>...) */
  readonly supportsNamedGroups: boolean;
  /** Whether the dialect supports lookbehind assertions (?<=...) */
  readonly supportsLookbehind: boolean;
  /** Whether the dialect supports backreferences like \1 or \k<name> */
  readonly supportsBackrefs: boolean;
  /** Maximum number of capture groups allowed */
  readonly maxGroups: number;
  /** Human-readable notes about dialect limitations */
  readonly notes: readonly string[];
}

const DIALECT_INFO: Record<Dialect, DialectInfo> = {
  js: {
    supportsNamedGroups: true,
    supportsLookbehind: true,
    supportsBackrefs: true,
    maxGroups: 10_000, // Effectively unlimited for our purposes
    notes: [],
  },
  re2: {
    supportsNamedGroups: false,
    supportsLookbehind: false,
    supportsBackrefs: false,
    maxGroups: 200,
    notes: ["No named groups", "No lookbehind", "No backreferences"],
  },
  pcre: {
    supportsNamedGroups: true,
    supportsLookbehind: true,
    supportsBackrefs: true,
    maxGroups: 65_535,
    notes: [],
  },
};

/**
 * Emitter state tracked during pattern compilation
 *
 * Maintains information about capture groups and dialect-specific
 * constraints as the AST is traversed and emitted.
 */
interface EmitState {
  /** Number of capture groups created so far */
  readonly groupCount: number;
  /** Map of named groups to their group numbers */
  readonly namedGroups: Record<string, number>;
  /** Accumulated warnings and notes during emission */
  readonly notes: string[];
  /** Target regex dialect */
  readonly dialect: Dialect;
}

/**
 * Result of emitting a pattern
 *
 * Contains the compiled regex string along with metadata about
 * captures and any warnings generated during compilation.
 */
interface EmitResult {
  /** The compiled regex pattern string */
  readonly pattern: string;
  /** Map of capture names/numbers to their positions */
  readonly captureMap: Record<string, number | number[]>;
  /** Warnings or notes generated during compilation */
  readonly notes: readonly string[];
}

/**
 * Main emit function - converts AST to regex pattern string
 *
 * Compiles a RegexBuilder AST into a concrete regex pattern string,
 * with support for multiple dialects and optional anchoring.
 *
 * @param builder - The RegexBuilder to emit
 * @param dialect - Target regex dialect (default: "js")
 * @param anchor - Whether to add ^ and $ anchors (default: false)
 * @returns RegexPattern with pattern string, AST, and metadata
 * @example
 * ```typescript
 * const builder = RegexBuilder.digit().oneOrMore();
 * const pattern = emit(builder, "js");
 * // pattern.pattern === "\\d+"
 *
 * const anchored = emit(builder, "js", true);
 * // anchored.pattern === "^\\d+$"
 * ```
 */
export const emit = (
  builder: RegexBuilder,
  dialect: Dialect = "js",
  anchor = false
): RegexPattern => {
  const ast = builder.getAst();
  const initialState: EmitState = {
    groupCount: 0,
    namedGroups: {},
    notes: [],
    dialect,
  };

  const { result, newState } = emitAst(ast, initialState);

  let finalPattern = result.pattern;
  if (anchor) {
    finalPattern = `^${finalPattern}$`;
  }

  // Add dialect-specific notes and state notes
  const dialectNotes = DIALECT_INFO[dialect].notes;
  const allNotes = [...result.notes, ...newState.notes, ...dialectNotes];

  return {
    pattern: finalPattern,
    ast,
    notes: allNotes,
    captureMap: result.captureMap,
  };
};

/**
 * Emit an AST node with state management
 */
const emitAst = (
  node: Ast,
  state: EmitState
): { result: EmitResult; newState: EmitState } => {
  let currentState = state;

  const processResult = (
    result: EmitResult
  ): { result: EmitResult; newState: EmitState } => ({
    result,
    newState: currentState,
  });

  switch (node.type) {
    case "lit":
      return processResult({
        pattern: node.value,
        captureMap: {},
        notes: [],
      });

    case "raw":
      return processResult({
        pattern: node.pattern,
        captureMap: {},
        notes: [],
      });

    case "seq": {
      const results: EmitResult[] = [];
      for (const child of node.children) {
        const { result, newState } = emitAst(child, currentState);
        results.push(result);
        currentState = newState;
      }
      const pattern = results.map((r) => r.pattern).join("");
      const captureMap = mergeCaptureMaps(results.map((r) => r.captureMap));
      const notes = results.flatMap((r) => r.notes);
      return processResult({ pattern, captureMap, notes });
    }

    case "alt": {
      // Children are already sorted deterministically in the AST
      const results: EmitResult[] = [];
      for (const child of node.children) {
        const { result, newState } = emitAst(child, currentState);
        results.push(result);
        currentState = newState;
      }
      const pattern = results.map((r) => r.pattern).join("|");
      const captureMap = mergeCaptureMaps(results.map((r) => r.captureMap));
      const notes = results.flatMap((r) => r.notes);
      return processResult({ pattern, captureMap, notes });
    }

    case "cls":
      return processResult({
        pattern: node.negated ? `[^${node.chars}]` : `[${node.chars}]`,
        captureMap: {},
        notes: [],
      });

    case "group": {
      const { result: childResult, newState } = emitAst(
        node.child,
        currentState
      );
      currentState = newState;
      const groupIndex = currentState.groupCount + 1;
      currentState = { ...currentState, groupCount: groupIndex };

      let pattern: string;
      const captureMap = { ...childResult.captureMap };

      if (node.name) {
        if (DIALECT_INFO[currentState.dialect].supportsNamedGroups) {
          pattern = `(?<${node.name}>${childResult.pattern})`;
          captureMap[node.name] = groupIndex;
        } else {
          // Downgrade to numbered group
          pattern = `(${childResult.pattern})`;
          captureMap[node.name] = groupIndex;
          currentState = {
            ...currentState,
            notes: [
              ...currentState.notes,
              `Named group "${node.name}" downgraded to numbered group ${groupIndex} for ${currentState.dialect.toUpperCase()}`,
            ],
          };
        }
      } else {
        pattern = `(${childResult.pattern})`;
      }

      return processResult({
        pattern,
        captureMap,
        notes: childResult.notes,
      });
    }

    case "noncap": {
      const { result: childResult, newState } = emitAst(
        node.child,
        currentState
      );
      currentState = newState;
      return processResult({
        pattern: `(?:${childResult.pattern})`,
        captureMap: childResult.captureMap,
        notes: childResult.notes,
      });
    }

    case "trycapture": {
      const { result: childResult, newState } = emitAst(
        node.child,
        currentState
      );
      currentState = newState;
      const groupIndex = currentState.groupCount + 1;
      currentState = { ...currentState, groupCount: groupIndex };

      let pattern: string;
      const captureMap = { ...childResult.captureMap };
      const notes = [...childResult.notes];

      // Add validation note if present
      if (node.validation) {
        notes.push(
          `TryCapture validation: ${node.validation.description}${node.validation.pattern ? ` (pattern: ${node.validation.pattern})` : ""}`
        );
      }

      if (node.name) {
        if (DIALECT_INFO[currentState.dialect].supportsNamedGroups) {
          pattern = `(?<${node.name}>${childResult.pattern})`;
          captureMap[node.name] = groupIndex;
        } else {
          // Downgrade to numbered group
          pattern = `(${childResult.pattern})`;
          captureMap[node.name] = groupIndex;
          currentState = {
            ...currentState,
            notes: [
              ...currentState.notes,
              `Named group "${node.name}" downgraded to numbered group ${groupIndex} for ${currentState.dialect.toUpperCase()}`,
            ],
          };
        }
      } else {
        pattern = `(${childResult.pattern})`;
      }

      return processResult({
        pattern,
        captureMap,
        notes,
      });
    }

    case "q": {
      const { result: childResult, newState } = emitAst(
        node.child,
        currentState
      );
      currentState = newState;
      const quantifier =
        node.max === null
          ? node.min === 0
            ? "*"
            : node.min === 1
              ? "+"
              : `{${node.min},}`
          : node.max === node.min
            ? `{${node.min}}`
            : `{${node.min},${node.max}}`;

      const pattern = `${childResult.pattern}${quantifier}${node.lazy ? "?" : ""}`;

      return processResult({
        pattern,
        captureMap: childResult.captureMap,
        notes: childResult.notes,
      });
    }

    case "anchor": {
      const anchorChar =
        node.position === "start" ? "^" : node.position === "end" ? "$" : "\\b";
      return processResult({
        pattern: anchorChar,
        captureMap: {},
        notes: [],
      });
    }

    case "backref": {
      const notes: string[] = [];
      let pattern: string;

      // Check dialect support
      if (DIALECT_INFO[currentState.dialect].supportsBackrefs) {
        // Named backreference
        if (typeof node.target === "string") {
          pattern = `\\k<${node.target}>`;
        } else {
          // Numbered backreference
          pattern = `\\${node.target}`;
        }
      } else {
        notes.push(
          `Backreferences not supported in ${currentState.dialect.toUpperCase()} dialect`
        );
        pattern = `__BACKREF_${typeof node.target === "string" ? node.target : node.target}_UNSUPPORTED__`;
      }

      return processResult({
        pattern,
        captureMap: {},
        notes,
      });
    }

    case "assertion": {
      const { result: childResult, newState } = emitAst(
        node.child,
        currentState
      );
      currentState = newState;
      const notes: string[] = [...childResult.notes];
      let pattern: string;

      // Check dialect support for lookbehind
      if (
        (node.kind === "lookbehind" || node.kind === "negative-lookbehind") &&
        !DIALECT_INFO[currentState.dialect].supportsLookbehind
      ) {
        notes.push(
          `${node.kind} not supported in ${currentState.dialect.toUpperCase()} dialect`
        );
        pattern = `__${node.kind.toUpperCase().replace(/-/g, "_")}_UNSUPPORTED__`;
      } else {
        // Emit assertion pattern
        switch (node.kind) {
          case "lookahead":
            pattern = `(?=${childResult.pattern})`;
            break;
          case "negative-lookahead":
            pattern = `(?!${childResult.pattern})`;
            break;
          case "lookbehind":
            pattern = `(?<=${childResult.pattern})`;
            break;
          case "negative-lookbehind":
            pattern = `(?<!${childResult.pattern})`;
            break;
        }
      }

      return processResult({
        pattern,
        captureMap: childResult.captureMap,
        notes,
      });
    }

    default:
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }
};

/**
 * Merge multiple capture maps
 */
const mergeCaptureMaps = (
  maps: Record<string, number | number[]>[]
): Record<string, number | number[]> => {
  const result: Record<string, number | number[]> = {};

  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      if (result[key]) {
        // Handle multiple occurrences (arrays)
        if (Array.isArray(result[key])) {
          (result[key] as number[]).push(value as number);
        } else {
          result[key] = [result[key] as number, value as number];
        }
      } else {
        result[key] = value;
      }
    }
  }

  return result;
};

/**
 * Validate pattern against dialect constraints
 */
export const validateDialect = (
  ast: Ast,
  dialect: Dialect
): { readonly valid: boolean; readonly issues: readonly string[] } => {
  const issues: string[] = [];
  const info = DIALECT_INFO[dialect];

  const validateNode = (node: Ast): void => {
    switch (node.type) {
      case "group":
        if (node.name && !info.supportsNamedGroups) {
          issues.push(`Named groups not supported in ${dialect.toUpperCase()}`);
        }
        validateNode(node.child);
        break;

      case "trycapture":
        if (node.name && !info.supportsNamedGroups) {
          issues.push(`Named groups not supported in ${dialect.toUpperCase()}`);
        }
        validateNode(node.child);
        break;

      case "backref":
        if (!info.supportsBackrefs) {
          issues.push(
            `Backreferences not supported in ${dialect.toUpperCase()}`
          );
        }
        break;

      case "assertion":
        if (
          (node.kind === "lookbehind" || node.kind === "negative-lookbehind") &&
          !info.supportsLookbehind
        ) {
          issues.push(`${node.kind} not supported in ${dialect.toUpperCase()}`);
        }
        validateNode(node.child);
        break;

      case "seq":
      case "alt":
        node.children.forEach(validateNode);
        break;

      case "noncap":
      case "q":
        validateNode(node.child);
        break;

      // Other nodes don't have dialect-specific issues
      default:
        break;
    }
  };

  validateNode(ast);

  return {
    valid: issues.length === 0,
    issues,
  };
};
