/**
 * Standard Library - Comprehensive Pattern Collection
 *
 * This module exports all standard regex patterns built using the RegexBuilder API.
 * Patterns are organized into two categories:
 *
 * 1. General Patterns (patterns.ts): Common validation patterns
 *    - Email, URL, username, phone numbers
 *    - Dates, times, colors
 *    - IP addresses, UUIDs, semantic versions
 *
 * 2. Security Patterns (security-patterns.ts): Security-focused patterns
 *    - Input sanitization and whitelisting
 *    - SQL injection detection
 *    - Safe filename and text validation
 *    - Credit cards, SSNs (for validation)
 */

// Export all general patterns
export * from "./patterns.js";

// Export all security patterns
export * from "./security-patterns.js";

// Create a unified registry combining both pattern sets
import { STANDARD_PATTERNS, type StandardPatternName } from "./patterns.js";
import { SECURITY_PATTERNS, type SecurityPatternName } from "./security-patterns.js";

/**
 * Complete registry of all available patterns
 */
export const ALL_PATTERNS = {
  ...STANDARD_PATTERNS,
  ...SECURITY_PATTERNS,
} as const;

export type AllPatternName = StandardPatternName | SecurityPatternName;

/**
 * Get a pattern by name
 */
export function getPattern(name: AllPatternName) {
  return ALL_PATTERNS[name];
}

/**
 * List all available pattern names
 */
export function listPatterns(): AllPatternName[] {
  return Object.keys(ALL_PATTERNS) as AllPatternName[];
}

/**
 * Search patterns by description or examples
 */
export function searchPatterns(query: string): AllPatternName[] {
  const lowerQuery = query.toLowerCase();
  return listPatterns().filter((name) => {
    const pattern = ALL_PATTERNS[name];
    return (
      pattern.description.toLowerCase().includes(lowerQuery) ||
      pattern.examples.some((ex) => ex.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Get patterns by dialect support
 */
export function getPatternsByDialect(dialect: "js" | "re2" | "pcre" | "universal") {
  return listPatterns().filter((name) => {
    const pattern = ALL_PATTERNS[name];
    return pattern.dialect === "universal" || pattern.dialect === dialect;
  });
}
