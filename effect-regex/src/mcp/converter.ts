/**
 * Regex Dialect Conversion Utilities
 *
 * Provides best-effort conversion between regex dialects (JS, RE2, PCRE).
 *
 * LIMITATIONS:
 * - This is a string-based conversion (no full AST parser for regex strings)
 * - Complex patterns may not convert perfectly
 * - Some features are detected heuristically
 * - Full string→AST parsing is deferred to post-1.0
 */

export type Dialect = "js" | "re2" | "pcre";

export interface ConversionResult {
  readonly pattern: string;
  readonly success: boolean;
  readonly changed: boolean;
  readonly notes: readonly string[];
  readonly warnings: readonly string[];
  readonly incompatibilities: readonly string[];
}

/**
 * Feature compatibility matrix
 */
const _FEATURES = {
  namedGroups: {
    js: true,
    re2: false, // RE2 doesn't support named groups
    pcre: true,
  },
  backreferences: {
    js: true,
    re2: false, // RE2 doesn't support backreferences
    pcre: true,
  },
  lookbehind: {
    js: true,
    re2: false, // RE2 doesn't support lookbehind
    pcre: true,
  },
  lookahead: {
    js: true,
    re2: false, // RE2 doesn't support lookahead (except in some contexts)
    pcre: true,
  },
};

/**
 * Detect features in a regex pattern (heuristic-based)
 */
function detectFeatures(pattern: string): {
  hasNamedGroups: boolean;
  hasBackreferences: boolean;
  hasLookbehind: boolean;
  hasLookahead: boolean;
} {
  return {
    // Named groups: (?<name>...)
    hasNamedGroups: /\(\?<[a-zA-Z_][a-zA-Z0-9_]*>/.test(pattern),

    // Backreferences: \1, \2, ... or \k<name>
    hasBackreferences: /\\[1-9]\d*|\\k<[a-zA-Z_][a-zA-Z0-9_]*>/.test(pattern),

    // Lookbehind: (?<=...) or (?<!...)
    hasLookbehind: /\(\?<[!=]/.test(pattern),

    // Lookahead: (?=...) or (?!...)
    hasLookahead: /\(\?[!=]/.test(pattern),
  };
}

/**
 * Convert named groups to numbered groups
 */
function removeNamedGroups(pattern: string): string {
  // Replace (?<name>...) with (...)
  return pattern.replace(/\(\?<[a-zA-Z_][a-zA-Z0-9_]*>/g, "(");
}

/**
 * Remove backreferences (replace with generic pattern)
 */
function removeBackreferences(pattern: string): string {
  // Replace \k<name> with .*? (non-greedy any)
  let result = pattern.replace(/\\k<[a-zA-Z_][a-zA-Z0-9_]*>/g, ".*?");
  // Replace \1, \2, etc. with .*?
  result = result.replace(/\\([1-9]\d*)/g, ".*?");
  return result;
}

/**
 * Remove lookbehind assertions
 */
function removeLookbehind(pattern: string): string {
  // This is a simplification - proper removal requires parsing
  // We just remove the lookbehind syntax, keeping the content
  // (?<=...) → "" (remove positive lookbehind)
  // (?<!...) → "" (remove negative lookbehind)

  // For now, just remove the lookbehind assertions entirely
  // This is lossy but prevents invalid patterns
  let result = pattern;

  // Match lookbehind patterns with balanced parentheses (simplified)
  // This is a heuristic and won't work for all cases
  result = result.replace(/\(\?<[!=][^)]*\)/g, "");

  return result;
}

/**
 * Remove lookahead assertions
 */
function removeLookahead(pattern: string): string {
  // Similar to lookbehind - simplified removal
  // (?=...) → "" (remove positive lookahead)
  // (?!...) → "" (remove negative lookahead)

  let result = pattern;
  result = result.replace(/\(\?[!=][^)]*\)/g, "");

  return result;
}

/**
 * Convert a regex pattern between dialects
 */
export function convertDialect(
  pattern: string,
  fromDialect: Dialect,
  toDialect: Dialect,
  allowDowngrades = true
): ConversionResult {
  const notes: string[] = [];
  const warnings: string[] = [];
  const incompatibilities: string[] = [];

  // If same dialect, no conversion needed
  if (fromDialect === toDialect) {
    return {
      pattern,
      success: true,
      changed: false,
      notes: ["No conversion needed - same dialect"],
      warnings: [],
      incompatibilities: [],
    };
  }

  // Validate source pattern
  try {
    new RegExp(pattern);
  } catch (error) {
    return {
      pattern,
      success: false,
      changed: false,
      notes: [],
      warnings: [],
      incompatibilities: [
        `Invalid source pattern: ${(error as Error).message}`,
      ],
    };
  }

  // Detect features in the pattern
  const features = detectFeatures(pattern);
  let convertedPattern = pattern;

  // Convert based on target dialect
  if (toDialect === "re2") {
    // Converting to RE2 - remove unsupported features
    notes.push("Converting to RE2 (limited feature set)");

    if (features.hasNamedGroups) {
      if (allowDowngrades) {
        convertedPattern = removeNamedGroups(convertedPattern);
        warnings.push("Named groups removed (not supported in RE2)");
        notes.push(
          "Converted named groups (?<name>...) to regular groups (...)"
        );
      } else {
        incompatibilities.push("Named groups not supported in RE2");
      }
    }

    if (features.hasBackreferences) {
      if (allowDowngrades) {
        convertedPattern = removeBackreferences(convertedPattern);
        warnings.push(
          "Backreferences replaced with .*? (not supported in RE2)"
        );
        notes.push("Backreferences are not supported in RE2");
      } else {
        incompatibilities.push("Backreferences not supported in RE2");
      }
    }

    if (features.hasLookbehind) {
      if (allowDowngrades) {
        convertedPattern = removeLookbehind(convertedPattern);
        warnings.push("Lookbehind assertions removed (not supported in RE2)");
        notes.push("Lookbehind assertions are not supported in RE2");
      } else {
        incompatibilities.push("Lookbehind assertions not supported in RE2");
      }
    }

    if (features.hasLookahead) {
      if (allowDowngrades) {
        convertedPattern = removeLookahead(convertedPattern);
        warnings.push("Lookahead assertions removed (not supported in RE2)");
        notes.push("Lookahead assertions are not supported in RE2");
      } else {
        incompatibilities.push("Lookahead assertions not supported in RE2");
      }
    }
  } else if (toDialect === "js") {
    // Converting to JS from RE2 or PCRE
    notes.push(`Converting from ${fromDialect} to JavaScript`);

    if (fromDialect === "re2") {
      notes.push("RE2 patterns should work in JavaScript (RE2 is a subset)");
    } else if (fromDialect === "pcre") {
      warnings.push("Some PCRE-specific features may not work in JavaScript");
      notes.push(
        "PCRE conversion to JS may require manual adjustments for advanced features"
      );
    }
  } else if (toDialect === "pcre") {
    // Converting to PCRE
    notes.push(`Converting from ${fromDialect} to PCRE`);

    if (fromDialect === "re2") {
      notes.push("RE2 patterns should work in PCRE (RE2 is a subset)");
    } else if (fromDialect === "js") {
      notes.push("Most JavaScript patterns work in PCRE");
      warnings.push(
        "Some JS-specific Unicode features may require PCRE equivalents"
      );
    }
  }

  // If we have incompatibilities and disallow downgrades, fail
  if (incompatibilities.length > 0 && !allowDowngrades) {
    return {
      pattern,
      success: false,
      changed: false,
      notes,
      warnings,
      incompatibilities,
    };
  }

  // Validate converted pattern
  try {
    new RegExp(convertedPattern);
  } catch (error) {
    warnings.push(
      `Converted pattern may have syntax issues: ${(error as Error).message}`
    );
  }

  const success = incompatibilities.length === 0 || allowDowngrades;
  const changed = pattern !== convertedPattern;

  return {
    pattern: convertedPattern,
    success,
    changed,
    notes,
    warnings,
    incompatibilities,
  };
}
