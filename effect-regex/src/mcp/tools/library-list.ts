/**
 * Library List Tool - List patterns in the standard library
 *
 * @module mcp/tools/library-list
 */

import { Effect } from "effect";
import { STANDARD_PATTERNS } from "../../std/patterns.js";
import type { LibraryListArgs, ToolHandler } from "../types.js";
import { toMcpError } from "../utils/validation.js";

/**
 * Handle library_list tool requests
 *
 * Lists all patterns in the standard library with optional filtering by:
 * - Dialect compatibility
 * - Search query (matches name or description)
 *
 * @param args - Filter options
 * @returns List of matching patterns with metadata
 */
export const handleLibraryList: ToolHandler<LibraryListArgs, any> = (args) => {
  return Effect.gen(function* () {
    // Get all patterns
    let patterns = Object.entries(STANDARD_PATTERNS).map(([name, pattern]) => ({
      name,
      description: pattern.description,
      examples: pattern.examples,
      dialect: pattern.dialect,
    }));

    // Apply filters if provided
    if (args?.filter) {
      const { dialect, search } = args.filter;

      if (dialect) {
        patterns = patterns.filter(
          (p) => p.dialect === dialect || p.dialect === "universal"
        );
      }

      if (search) {
        const searchLower = search.toLowerCase();
        patterns = patterns.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower)
        );
      }
    }

    return {
      total: patterns.length,
      patterns,
      filters: args?.filter || null,
    };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(toMcpError(error, "Library list failed"))
    )
  );
};
