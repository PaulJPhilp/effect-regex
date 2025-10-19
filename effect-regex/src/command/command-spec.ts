/**
 * CommandSpec types and interfaces for building CLI command regexes
 */

export interface CommandFlag {
  readonly name: string;
  readonly short?: string;
  readonly takesValue?: boolean;
  readonly valuePattern?: string;
  readonly repeatable?: boolean;
}

export interface CommandOption {
  readonly key: string;
  readonly short?: string;
  readonly valuePattern: string;
  readonly required?: boolean;
  readonly repeatable?: boolean;
  readonly separator?: "=" | " ";
}

export interface CommandPositional {
  readonly name: string;
  readonly pattern?: string;
  readonly optional?: boolean;
  readonly repeatable?: boolean;
}

export interface CommandSpec {
  readonly name: string;
  readonly subcommands?: readonly string[];
  readonly flags?: readonly CommandFlag[];
  readonly options?: readonly CommandOption[];
  readonly positionals?: readonly CommandPositional[];
  readonly allowInterleaving?: boolean;
}

export interface CommandRegexResult {
  readonly pattern: string;
  readonly captureMap: Record<string, number | number[]>;
  readonly notes: readonly string[];
}

/**
 * Build a regex pattern from a CommandSpec with proper interleaving support
 */
export const buildCommandRegex = (
  spec: CommandSpec,
  dialect: "js" | "re2" | "pcre" = "js"
): CommandRegexResult => {
  const notes: string[] = [];
  const captureMap: Record<string, number | number[]> = {};
  let groupCount = 0;

  // Build subcommand pattern (must come first)
  let subcommandPattern = "";
  if (spec.subcommands && spec.subcommands.length > 0) {
    const subcommandAlts = spec.subcommands.map(cmd => `\\b${cmd}\\b`).join("|");
    subcommandPattern = `(${subcommandAlts})`;
    captureMap.subcommand = ++groupCount;
  }

  // Build individual flag patterns
  const flagParts: string[] = [];
  if (spec.flags) {
    for (const flag of spec.flags) {
      const longFlag = `--${flag.name}`;
      const shortFlag = flag.short ? `-${flag.short}` : null;
      const flagNames = [longFlag];
      if (shortFlag) flagNames.push(shortFlag);

      let flagPattern = `(?:${flagNames.join("|")})`;

      if (flag.takesValue && flag.valuePattern) {
        // Space-separated value for flags
        flagPattern += `\\s+(${flag.valuePattern})`;
        captureMap[`flag_${flag.name}_value`] = ++groupCount;
      }

      // Make flags optional and repeatable if specified
      if (flag.repeatable) {
        flagPattern = `(?:${flagPattern})*`;
        // For repeatable flags, we need array capture map
        const existing = captureMap[`flag_${flag.name}`];
        if (existing) {
          captureMap[`flag_${flag.name}`] = Array.isArray(existing) ? existing : [existing, ++groupCount];
        } else {
          captureMap[`flag_${flag.name}`] = ++groupCount;
        }
      } else {
        flagPattern = `(?:${flagPattern})?`;
        captureMap[`flag_${flag.name}`] = ++groupCount;
      }

      flagParts.push(flagPattern);
    }
  }

  // Build individual option patterns
  const optionParts: string[] = [];
  if (spec.options) {
    for (const option of spec.options) {
      const longOption = `--${option.key}`;
      const shortOption = option.short ? `-${option.short}` : null;
      const optionNames = [longOption];
      if (shortOption) optionNames.push(shortOption);

      const separator = option.separator || "=";
      const sepPattern = separator === "=" ? "=" : "\\s+";

      let optionPattern = `(?:${optionNames.join("|")})${sepPattern}(${option.valuePattern})`;

      // Make options optional by default unless required
      if (!option.required) {
        optionPattern = `(?:${optionPattern})?`;
      }

      // Handle repeatable options
      if (option.repeatable) {
        if (option.required) {
          optionPattern = `(?:${optionPattern})+`;
        } else {
          optionPattern = `(?:${optionPattern})*`;
        }
        // For repeatable options, array capture map
        const existing = captureMap[`opt_${option.key}_value`];
        if (existing) {
          captureMap[`opt_${option.key}_value`] = Array.isArray(existing) ? existing : [existing];
        }
      }

      captureMap[`opt_${option.key}_value`] = ++groupCount;
      optionParts.push(optionPattern);
    }
  }

  // Build positional patterns
  const positionalPatterns: string[] = [];
  if (spec.positionals) {
    for (const positional of spec.positionals) {
      const pattern = positional.pattern || "[^\\s]+";
      let posPattern = `(${pattern})`;

      // Handle optional positionals
      if (positional.optional) {
        posPattern = `(?:${posPattern})?`;
      }

      // Handle repeatable positionals
      if (positional.repeatable) {
        if (positional.optional) {
          posPattern = `(?:${posPattern})*`;
        } else {
          posPattern = `(?:${posPattern})+`;
        }
        // Array capture for repeatable positionals
        const existing = captureMap[`pos_${positional.name}`];
        if (existing) {
          captureMap[`pos_${positional.name}`] = Array.isArray(existing) ? existing : [existing];
        }
      }

      captureMap[`pos_${positional.name}`] = ++groupCount;
      positionalPatterns.push(posPattern);
    }
  }

  // Combine patterns based on interleaving support
  let combinedPattern: string;

  if (spec.allowInterleaving) {
    // With interleaving, flags and options can appear in any order before positionals
    const optionalParts = [...flagParts, ...optionParts];
    const interleavedOptionals = optionalParts.length > 0 ? `(?:${optionalParts.join("\\s+|")}\\s*)*` : "";

    if (positionalPatterns.length > 0) {
      combinedPattern = `${subcommandPattern}\\s+${interleavedOptionals}${positionalPatterns.join("\\s+")}`;
    } else {
      combinedPattern = `${subcommandPattern}\\s+${interleavedOptionals}`;
    }
  } else {
    // Without interleaving, strict order: subcommand + flags + options + positionals
    const allParts = [
      subcommandPattern,
      ...flagParts,
      ...optionParts,
      ...positionalPatterns
    ].filter(Boolean);

    combinedPattern = allParts.join("\\s+");
  }

  // Clean up and optimize the pattern
  const finalPattern = combinedPattern
    // Remove unnecessary non-capturing groups
    .replace(/\(\?:([^)]*)\)\?/g, '(?:$1)?') // Simplify optional non-capturing groups
    // Add word boundaries
    .replace(/^/, '\\b')
    .replace(/$/, '\\b');

  // Add notes about limitations and features
  if (!spec.allowInterleaving) {
    notes.push("Strict argument ordering enforced - flags and options must appear before positionals");
  }

  if (dialect === "re2") {
    notes.push("RE2 dialect: named groups converted to numbered groups");
  }

  return {
    pattern: finalPattern,
    captureMap,
    notes,
  };
};
