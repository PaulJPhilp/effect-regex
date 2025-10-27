/**
 * Convert Regex Tool - Convert patterns between dialects
 *
 * @module mcp/tools/convert-regex
 */

import { Effect } from "effect";
import { convertDialect } from "../converter.js";
import type { ConvertRegexArgs, ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle convert_regex tool requests
 *
 * Converts regex patterns between dialects (js, re2, pcre) with:
 * - Best-effort compatibility mapping
 * - Feature detection and downgrade notes
 * - Incompatibility warnings
 * - Conversion limitations documentation
 *
 * Note: Uses heuristic string-based conversion, not full regex parsing.
 * Complex patterns may require manual review.
 *
 * @param args - Pattern, source/target dialects, and downgrade options
 * @returns Converted pattern with notes, warnings, and incompatibilities
 */
export const handleConvertRegex: ToolHandler<ConvertRegexArgs, any> = (
  args
) => {
  return Effect.gen(function* () {
    yield* validateInputEffect(args);

    const {
      pattern,
      fromDialect = "js",
      toDialect,
      allowDowngrades = true,
    } = args;

    // Perform dialect conversion
    const conversionResult = convertDialect(
      pattern,
      fromDialect,
      toDialect,
      allowDowngrades
    );

    // Build response
    const result = {
      originalPattern: pattern,
      pattern: conversionResult.pattern,
      fromDialect,
      toDialect,
      success: conversionResult.success,
      changed: conversionResult.changed,
      notes: conversionResult.notes,
      warnings: conversionResult.warnings,
      incompatibilities: conversionResult.incompatibilities,
      limitations: [
        "String-based conversion (no full regex parser)",
        "Complex patterns may require manual review",
        "Heuristic feature detection may miss some cases",
        "Nested constructs may not be handled correctly",
      ],
    };

    return result;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(toMcpError(error, "Conversion failed"))
    )
  );
};
