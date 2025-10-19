import { RegexBuilder, digit, word } from "../core/builder.js";

/**
 * Standard library of vetted regex patterns
 * All patterns are designed to work with both JS and RE2 dialects
 */

// Tier 1: CLI-relevant patterns (M1 priority)

/**
 * Matches quoted strings (single or double quotes)
 * Examples: "hello world", 'foo bar'
 * Note: Simplified version without escape handling for M1
 */
export const quotedString = RegexBuilder.charClass(`"'`)
  .then(RegexBuilder.charClass(`"'\\`, true).zeroOrMore())
  .then(RegexBuilder.charClass(`"'`))
  .group("quoted");

/**
 * Matches key=value pairs
 * Examples: port=8080, name="John Doe", debug=true
 */
export const keyValue = word()
  .oneOrMore()
  .then(RegexBuilder.lit("="))
  .then(
    RegexBuilder.alt(
      quotedString,           // Reuse quoted string pattern
      word().oneOrMore(),     // Or simple unquoted values
      digit().oneOrMore()     // Or numeric values
    )
  )
  .group("kv");

/**
 * Matches path segments (directory/file names)
 * Examples: src, main.ts, node_modules, .hidden-file
 */
export const pathSegment = RegexBuilder.alt(
  RegexBuilder.lit("."), // Hidden files
  word()
)
  .then(
    RegexBuilder.alt(
      word(),
      RegexBuilder.lit("-"),
      RegexBuilder.lit("_"),
      RegexBuilder.lit(".")
    ).zeroOrMore()
  )
  .group("segment");

/**
 * Matches basic file paths
 * Examples: /usr/bin/node, ./src/main.ts, relative/path/file.txt
 */
export const filePathBasic = RegexBuilder.alt(
  RegexBuilder.lit("./"),  // Relative path
  RegexBuilder.lit("../"), // Parent directory
  RegexBuilder.lit("/"),   // Absolute path
  pathSegment              // Just filename
)
  .then(
    RegexBuilder.alt(
      RegexBuilder.lit("/").then(pathSegment),
      RegexBuilder.lit("\\").then(pathSegment) // Windows support
    ).zeroOrMore()
  )
  .group("path");

/**
 * Matches CSV list items
 * Examples: item1,item2,item3 (handles quoted items with commas)
 */
export const csvList = RegexBuilder.alt(
  quotedString, // Quoted items can contain commas
  RegexBuilder.charClass(",\n\r", true).oneOrMore() // Unquoted items
)
  .then(
    RegexBuilder.lit(",").then(
      RegexBuilder.alt(
        quotedString,
        RegexBuilder.charClass(",\n\r", true).oneOrMore()
      )
    ).zeroOrMore()
  )
  .group("csv");

/**
 * Matches integer numbers (positive/negative)
 * Examples: 42, -123, +0, 999999
 */
export const integer = RegexBuilder.alt(
  RegexBuilder.lit("+"),
  RegexBuilder.lit("-"),
  RegexBuilder.raw("") // Optional sign
)
  .then(digit().oneOrMore())
  .group("int");

// Tier 2: Advanced CLI-relevant patterns

/**
 * Matches UUID v4 format
 * Examples: 123e4567-e89b-12d3-a456-426614174000
 */
export const uuidV4 = RegexBuilder.lit("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx")
  .group("uuid");

/**
 * Matches strict semantic version format
 * Examples: 1.0.0, 2.1.3-alpha.1, 3.0.0-beta.2+build.1
 */
export const semverStrict = RegexBuilder.lit("v").optional()
  .then(digit().oneOrMore())
  .then(RegexBuilder.lit("."))
  .then(digit().oneOrMore())
  .then(RegexBuilder.lit("."))
  .then(digit().oneOrMore())
  .then(
    RegexBuilder.lit("-")
      .then(RegexBuilder.charClass("a-zA-Z0-9").oneOrMore())
      .then(RegexBuilder.lit(".").then(digit().oneOrMore()).zeroOrMore())
      .zeroOrMore()
  )
  .optional()
  .then(
    RegexBuilder.lit("+")
      .then(RegexBuilder.charClass("a-zA-Z0-9").oneOrMore())
      .zeroOrMore()
  )
  .optional()
  .group("semver");

// Tier 3: General utility patterns

/**
 * Matches IPv4 addresses
 * Examples: 192.168.1.1, 10.0.0.1, 172.16.0.1
 */
export const ipv4 = digit()
  .between(1, 3)
  .then(RegexBuilder.lit("."))
  .then(digit().between(1, 3))
  .then(RegexBuilder.lit("."))
  .then(digit().between(1, 3))
  .then(RegexBuilder.lit("."))
  .then(digit().between(1, 3))
  .group("ipv4");

/**
 * Matches compressed IPv6 addresses
 * Examples: ::1, 2001:db8::1, ::ffff:192.0.2.1
 */
export const ipv6Compressed = RegexBuilder.alt(
  // Full IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
  RegexBuilder.lit("([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}"),
  // Compressed: 2001:db8:85a3::8a2e:370:7334
  RegexBuilder.lit("([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}"),
  // ::1 (loopback)
  RegexBuilder.lit("::1"),
  // IPv4-mapped IPv6: ::ffff:192.0.2.1
  RegexBuilder.lit("::ffff:(?:\\d{1,3}\\.){3}\\d{1,3}")
)
.group("ipv6");

/**
 * Matches floating point numbers
 * Examples: 3.14, -0.5, 1.23e-4, 42.0
 */
export const float = RegexBuilder.lit("-").optional()
  .then(digit().oneOrMore())
  .then(
    RegexBuilder.lit(".")
      .then(digit().oneOrMore())
      .optional()
  )
  .then(
    RegexBuilder.alt(
      RegexBuilder.lit("e"),
      RegexBuilder.lit("E")
    )
    .then(
      RegexBuilder.alt(
        RegexBuilder.lit("+"),
        RegexBuilder.lit("-")
      ).optional()
    )
    .then(digit().oneOrMore())
    .optional()
  )
  .group("float");

/**
 * Matches ISO date format (YYYY-MM-DD)
 * Examples: 2023-12-25, 1999-01-01
 */
export const isoDate = RegexBuilder.lit("\\d{4}-\\d{2}-\\d{2}")
  .group("date");

/**
 * Matches ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * Examples: 2023-12-25T10:30:00.000Z, 1999-01-01T23:59:59Z
 */
export const isoDateTime = RegexBuilder.lit("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}")
  .then(
    RegexBuilder.lit("\\.\\d{3}").optional()
  )
  .then(RegexBuilder.lit("Z"))
  .group("datetime");

/**
 * Registry of all standard patterns
 */
export const STANDARD_PATTERNS = {
  quotedString: {
    pattern: quotedString,
    description: "Matches quoted strings (single or double quotes)",
    examples: ['"hello world"', "'foo bar'", '"it\'s working"'],
    dialect: "universal" as const,
  },
  keyValue: {
    pattern: keyValue,
    description: "Matches key=value pairs",
    examples: ["port=8080", 'name="John Doe"', "debug=true"],
    dialect: "universal" as const,
  },
  pathSegment: {
    pattern: pathSegment,
    description: "Matches path segments (directory/file names)",
    examples: ["src", "main.ts", "node_modules", ".hidden-file"],
    dialect: "universal" as const,
  },
  filePathBasic: {
    pattern: filePathBasic,
    description: "Matches basic file paths",
    examples: ["/usr/bin/node", "./src/main.ts", "relative/path/file.txt"],
    dialect: "universal" as const,
  },
  csvList: {
    pattern: csvList,
    description: "Matches CSV list items",
    examples: ["item1,item2,item3", '"item 1","item,2","item 3"'],
    dialect: "universal" as const,
  },
  integer: {
    pattern: integer,
    description: "Matches integer numbers (positive/negative)",
    examples: ["42", "-123", "+0", "999999"],
    dialect: "universal" as const,
  },
  uuidV4: {
    pattern: uuidV4,
    description: "Matches UUID v4 format",
    examples: ["123e4567-e89b-12d3-a456-426614174000"],
    dialect: "universal" as const,
  },
  semverStrict: {
    pattern: semverStrict,
    description: "Matches strict semantic version format",
    examples: ["1.0.0", "2.1.3-alpha.1", "3.0.0-beta.2+build.1"],
    dialect: "universal" as const,
  },
  ipv4: {
    pattern: ipv4,
    description: "Matches IPv4 addresses",
    examples: ["192.168.1.1", "10.0.0.1", "172.16.0.1"],
    dialect: "universal" as const,
  },
  ipv6Compressed: {
    pattern: ipv6Compressed,
    description: "Matches compressed IPv6 addresses",
    examples: ["::1", "2001:db8::1", "::ffff:192.0.2.1"],
    dialect: "universal" as const,
  },
  float: {
    pattern: float,
    description: "Matches floating point numbers",
    examples: ["3.14", "-0.5", "1.23e-4", "42.0"],
    dialect: "universal" as const,
  },
  isoDate: {
    pattern: isoDate,
    description: "Matches ISO date format (YYYY-MM-DD)",
    examples: ["2023-12-25", "1999-01-01"],
    dialect: "universal" as const,
  },
  isoDateTime: {
    pattern: isoDateTime,
    description: "Matches ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)",
    examples: ["2023-12-25T10:30:00.000Z", "1999-01-01T23:59:59Z"],
    dialect: "universal" as const,
  },
} as const;

export type StandardPatternName = keyof typeof STANDARD_PATTERNS;
