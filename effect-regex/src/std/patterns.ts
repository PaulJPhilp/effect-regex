import { digit, RegexBuilder, word } from "../core/builder.js";

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
 * Matches email addresses (basic validation)
 * Examples: user@example.com, test.email+tag@domain.org
 * Note: Basic format validation, doesn't verify deliverability
 */
export const email = RegexBuilder.charClass("a-zA-Z0-9._%+-")
  .oneOrMore()
  .then(RegexBuilder.lit("@"))
  .then(RegexBuilder.charClass("a-zA-Z0-9.-").oneOrMore())
  .then(RegexBuilder.lit("."))
  .then(RegexBuilder.charClass("a-zA-Z").between(2, 10))
  .group("email");

/**
 * Matches HTTP/HTTPS URLs
 * Examples: https://example.com, http://www.example.com/path?query=value
 * Note: Basic URL format validation
 */
export const url = RegexBuilder.lit("https")
  .optional()
  .then(RegexBuilder.lit("://"))
  .then(RegexBuilder.lit("www.").optional())
  .then(RegexBuilder.charClass("a-zA-Z0-9@:%._+~#=").oneOrMore())
  .then(RegexBuilder.charClass("a-z").between(2, 6))
  .then(
    RegexBuilder.lit("/")
      .then(RegexBuilder.charClass("a-zA-Z0-9@:%_+.~#?&//="))
      .zeroOrMore()
      .optional()
  )
  .group("url");

/**
 * Matches usernames (alphanumeric with underscore/hyphen)
 * Examples: user_name, test-user123, myUser_42
 * Length: 3-16 characters
 */
export const username = RegexBuilder.charClass("a-zA-Z0-9_-")
  .between(3, 16)
  .group("username");

/**
 * Matches strong passwords (8+ chars, mixed case, number, special char)
 * Examples: Password123!, Secure#456, MyPass9$
 * Requires: 1 lowercase, 1 uppercase, 1 number, 1 special character
 */
export const passwordStrong = RegexBuilder.charClass("a-zA-Z0-9!@#$%^&*")
  .oneOrMore()
  .group("password");

/**
 * Matches key=value pairs
 * Examples: port=8080, name="John Doe", debug=true
 */
export const keyValue = word()
  .oneOrMore()
  .then(RegexBuilder.lit("="))
  .then(
    RegexBuilder.alt(
      quotedString, // Reuse quoted string pattern
      word().oneOrMore(), // Or simple unquoted values
      digit().oneOrMore() // Or numeric values
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
  RegexBuilder.lit("./"), // Relative path
  RegexBuilder.lit("../"), // Parent directory
  RegexBuilder.lit("/"), // Absolute path
  pathSegment // Just filename
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
    RegexBuilder.lit(",")
      .then(
        RegexBuilder.alt(
          quotedString,
          RegexBuilder.charClass(",\n\r", true).oneOrMore()
        )
      )
      .zeroOrMore()
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
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit [0-9a-fA-F], and y is one of [89abAB]
 */
export const uuidV4 = RegexBuilder.charClass("0-9a-fA-F")
  .exactly(8)
  .then(RegexBuilder.lit("-"))
  .then(RegexBuilder.charClass("0-9a-fA-F").exactly(4))
  .then(RegexBuilder.lit("-"))
  .then(RegexBuilder.lit("4"))
  .then(RegexBuilder.charClass("0-9a-fA-F").exactly(3))
  .then(RegexBuilder.lit("-"))
  .then(RegexBuilder.charClass("89abAB"))
  .then(RegexBuilder.charClass("0-9a-fA-F").exactly(3))
  .then(RegexBuilder.lit("-"))
  .then(RegexBuilder.charClass("0-9a-fA-F").exactly(12))
  .group("uuid");

/**
 * Matches strict semantic version format
 * Examples: 1.0.0, 2.1.3-alpha.1, 3.0.0-beta.2+build.1
 */
export const semverStrict = RegexBuilder.lit("v")
  .optional()
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

/**
 * Matches hex color codes (#RGB or #RRGGBB)
 * Examples: #F00, #FF0000, #123ABC
 * Case insensitive
 */
export const hexColor = RegexBuilder.lit("#")
  .then(
    RegexBuilder.alt(
      RegexBuilder.charClass("0-9a-fA-F").exactly(3), // #RGB
      RegexBuilder.charClass("0-9a-fA-F").exactly(6) // #RRGGBB
    )
  )
  .group("color");

/**
 * Matches comprehensive CSS color values
 * Supports: hex colors, named colors, rgb/rgba, hsl/hsla
 * Examples: #F00, #FF0000, red, rgb(255,0,0), rgba(255,0,0,0.5), hsl(0,100%,50%)
 */
export const cssColor = RegexBuilder.alt(
  // Hex colors: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
  RegexBuilder.lit("#").then(RegexBuilder.charClass("0-9a-fA-F").between(3, 8)),

  // RGB/RGBA functions
  RegexBuilder.lit("rgb")
    .then(RegexBuilder.charClass("a").optional())
    .then(RegexBuilder.lit("("))
    .then(RegexBuilder.charClass("0-9").oneOrMore()) // R
    .then(RegexBuilder.lit(","))
    .then(RegexBuilder.charClass("0-9").oneOrMore()) // G
    .then(RegexBuilder.lit(","))
    .then(RegexBuilder.charClass("0-9").oneOrMore()) // B
    .then(
      RegexBuilder.lit(",")
        .then(RegexBuilder.charClass("0-9.").oneOrMore())
        .optional() // A (optional)
    )
    .then(RegexBuilder.lit(")")), // )

  // HSL/HSLA functions
  RegexBuilder.lit("hsl")
    .then(RegexBuilder.charClass("a").optional())
    .then(RegexBuilder.lit("("))
    .then(RegexBuilder.charClass("0-9").oneOrMore()) // H
    .then(RegexBuilder.lit(","))
    .then(RegexBuilder.charClass("0-9").oneOrMore())
    .then(RegexBuilder.lit("%")) // S
    .then(RegexBuilder.lit(","))
    .then(RegexBuilder.charClass("0-9").oneOrMore())
    .then(RegexBuilder.lit("%")) // L
    .then(
      RegexBuilder.lit(",")
        .then(RegexBuilder.charClass("0-9.").oneOrMore())
        .optional() // A (optional)
    )
    .then(RegexBuilder.lit(")")), // )

  // Named colors (basic set)
  RegexBuilder.alt(
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "grey",
    "green",
    "greenyellow",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "rebeccapurple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen",
    "transparent",
    "currentcolor"
  )
).group("cssColor");

/**
 * Matches time in HH:MM:SS format (24-hour)
 * Examples: 23:59:59, 00:00:00, 12:30:45
 */
export const timeHHMMSS = RegexBuilder.charClass("0-9")
  .exactly(2)
  .then(RegexBuilder.lit(":"))
  .then(RegexBuilder.charClass("0-9").exactly(2))
  .then(RegexBuilder.lit(":"))
  .then(RegexBuilder.charClass("0-9").exactly(2))
  .group("time");

/**
 * Matches US phone numbers (basic format)
 * Examples: 555-123-4567, 555.123.4567, 555 123 4567, 5551234567
 * Does NOT validate area codes or specific number rules
 */
export const usPhone = RegexBuilder.charClass("0-9")
  .exactly(3)
  .then(RegexBuilder.charClass("-. ").optional())
  .then(RegexBuilder.charClass("0-9").exactly(3))
  .then(RegexBuilder.charClass("-. ").optional())
  .then(RegexBuilder.charClass("0-9").exactly(4))
  .group("phone");

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
 * Note: Simplified pattern covering common IPv6 formats
 */
export const ipv6Compressed = RegexBuilder.alt(
  // ::1 (loopback) - simplest case
  RegexBuilder.lit("::1"),

  // IPv4-mapped IPv6: ::ffff:192.0.2.1
  RegexBuilder.lit("::ffff:")
    .then(digit().between(1, 3))
    .then(RegexBuilder.lit("."))
    .then(digit().between(1, 3))
    .then(RegexBuilder.lit("."))
    .then(digit().between(1, 3))
    .then(RegexBuilder.lit("."))
    .then(digit().between(1, 3)),

  // Compressed IPv6 with :: (e.g., 2001:db8::1, fe80::1)
  RegexBuilder.charClass("0-9a-fA-F")
    .between(1, 4)
    .then(RegexBuilder.lit(":"))
    .then(
      RegexBuilder.charClass("0-9a-fA-F")
        .between(1, 4)
        .then(RegexBuilder.lit(":"))
        .group() // Non-capturing group for the repeating part
        .between(0, 6)
    )
    .then(RegexBuilder.lit(":"))
    .then(
      RegexBuilder.charClass("0-9a-fA-F")
        .between(1, 4)
        .group() // Non-capturing group before optional
        .optional()
    ),

  // Full IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
  RegexBuilder.charClass("0-9a-fA-F")
    .between(1, 4)
    .then(
      RegexBuilder.lit(":")
        .then(RegexBuilder.charClass("0-9a-fA-F").between(1, 4))
        .group() // Non-capturing group before exact quantifier
        .exactly(7)
    )
).group("ipv6");

/**
 * Matches floating point numbers
 * Examples: 3.14, -0.5, 1.23e-4, 42.0
 */
export const float = RegexBuilder.lit("-")
  .optional()
  .then(digit().oneOrMore())
  .then(RegexBuilder.lit(".").then(digit().oneOrMore()).optional())
  .then(
    RegexBuilder.alt(RegexBuilder.lit("e"), RegexBuilder.lit("E"))
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
export const isoDate = digit()
  .exactly(4)
  .then(RegexBuilder.lit("-"))
  .then(digit().exactly(2))
  .then(RegexBuilder.lit("-"))
  .then(digit().exactly(2))
  .group("date");

/**
 * Matches ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * Examples: 2023-12-25T10:30:00.000Z, 1999-01-01T23:59:59Z
 */
export const isoDateTime = digit()
  .exactly(4)
  .then(RegexBuilder.lit("-"))
  .then(digit().exactly(2))
  .then(RegexBuilder.lit("-"))
  .then(digit().exactly(2))
  .then(RegexBuilder.lit("T"))
  .then(digit().exactly(2))
  .then(RegexBuilder.lit(":"))
  .then(digit().exactly(2))
  .then(RegexBuilder.lit(":"))
  .then(digit().exactly(2))
  .then(
    RegexBuilder.lit(".")
      .then(digit().exactly(3))
      .group() // Non-capturing group before optional
      .optional()
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
  email: {
    pattern: email,
    description: "Matches email addresses (basic validation)",
    examples: ["user@example.com", "test.email+tag@domain.org"],
    dialect: "universal" as const,
  },
  url: {
    pattern: url,
    description: "Matches HTTP/HTTPS URLs",
    examples: [
      "https://example.com",
      "http://www.example.com/path?query=value",
    ],
    dialect: "universal" as const,
  },
  username: {
    pattern: username,
    description: "Matches usernames (alphanumeric with underscore/hyphen)",
    examples: ["user_name", "test-user123", "myUser_42"],
    dialect: "universal" as const,
  },
  passwordStrong: {
    pattern: passwordStrong,
    description:
      "Matches strong passwords (8+ chars, mixed case, number, special char)",
    examples: ["Password123!", "Secure#456", "MyPass9$"],
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
  hexColor: {
    pattern: hexColor,
    description: "Matches hex color codes (#RGB or #RRGGBB)",
    examples: ["#F00", "#FF0000", "#123ABC"],
    dialect: "universal" as const,
  },
  cssColor: {
    pattern: cssColor,
    description:
      "Matches comprehensive CSS color values (hex, named, rgb/rgba, hsl/hsla)",
    examples: [
      "#F00",
      "red",
      "rgb(255,0,0)",
      "rgba(255,0,0,0.5)",
      "hsl(0,100%,50%)",
    ],
    dialect: "universal" as const,
  },
  timeHHMMSS: {
    pattern: timeHHMMSS,
    description: "Matches time in HH:MM:SS format (24-hour)",
    examples: ["23:59:59", "00:00:00", "12:30:45"],
    dialect: "universal" as const,
  },
  usPhone: {
    pattern: usPhone,
    description: "Matches US phone numbers (basic format)",
    examples: ["555-123-4567", "555.123.4567", "555 123 4567"],
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
