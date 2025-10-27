import { digit, RegexBuilder } from "../core/builder.js";

/**
 * Security-focused and validation patterns
 * These patterns are designed for input validation, sanitization, and security checks
 */

/**
 * Matches alphanumeric characters only (no spaces)
 * Examples: abc123, Test42, User1
 * Use for: strict alphanumeric input validation
 */
export const alphanumeric = RegexBuilder.charClass("a-zA-Z0-9")
  .oneOrMore()
  .group("alphanum");

/**
 * Matches alphanumeric with spaces
 * Examples: "Hello World", "User 123", "Test Data"
 * Use for: names, titles, general text fields
 */
export const alphanumericWithSpaces = RegexBuilder.charClass("a-zA-Z0-9 ")
  .oneOrMore()
  .group("alphanumSpace");

/**
 * Matches safe "simple text" (letters, numbers, space, basic punctuation)
 * Examples: "Hello, World!", "Test-123", "User's data"
 * Use for: general text input where you want to allow common punctuation
 */
export const safeText = RegexBuilder.charClass("a-zA-Z0-9 .,\\-_'\"")
  .oneOrMore()
  .group("safeText");

/**
 * Detects typical SQL meta-characters (for scanning/flagging)
 * Matches: ', --, #, %27, %23
 * Use for: detecting potential SQL injection attempts
 * Note: This is for DETECTION only, not for validation
 */
export const sqlMetaChars = RegexBuilder.alt(
  RegexBuilder.lit("%27"),
  RegexBuilder.lit("'"),
  RegexBuilder.lit("--"),
  RegexBuilder.lit("%23"),
  RegexBuilder.lit("#")
).group("sqlMeta");

/**
 * Matches valid hostname/domain labels
 * Examples: "example", "my-server", "web01"
 * Format: 1-63 characters, letters/numbers/hyphens, cannot start/end with hyphen
 * Use for: hostname validation
 */
export const hostname = RegexBuilder.charClass("A-Za-z0-9")
  .then(RegexBuilder.charClass("A-Za-z0-9-").between(0, 61))
  .then(RegexBuilder.charClass("A-Za-z0-9"))
  .group("hostname");

/**
 * Matches safe filenames (no path traversal chars)
 * Excludes: < > : " / \ | ? * and control characters
 * Examples: "document.txt", "my-file.pdf", "data_2024.csv"
 * Use for: filename validation
 */
export const safeFilename = RegexBuilder.charClass(
  '<>:"\\/|?*\\x00-\\x1F',
  true
)
  .oneOrMore()
  .group("safeFilename");

/**
 * Matches US Social Security Number (AAA-GG-SSSS format)
 * Examples: "123-45-6789", "987-65-4321"
 * Use for: SSN validation (basic format only)
 */
export const usSSN = digit()
  .exactly(3)
  .then(RegexBuilder.lit("-"))
  .then(digit().exactly(2))
  .then(RegexBuilder.lit("-"))
  .then(digit().exactly(4))
  .group("ssn");

/**
 * Matches credit card numbers (13-16 digits, with optional spaces/hyphens)
 * Examples: "4532-1488-0343-6467", "4532 1488 0343 6467", "4532148803436467"
 * Use for: basic credit card format validation
 * Note: Does not validate checksum or card type
 */
export const creditCard = digit()
  .then(RegexBuilder.charClass(" -").optional())
  .between(13, 19) // Accounts for digits and separators
  .group("creditCard");

/**
 * Matches MAC addresses (six hex pairs separated by : or -)
 * Examples: "00:1A:2B:3C:4D:5E", "00-1A-2B-3C-4D-5E"
 * Use for: MAC address validation
 */
export const macAddress = RegexBuilder.charClass("0-9A-Fa-f")
  .exactly(2)
  .then(RegexBuilder.charClass(":-"))
  .exactly(5)
  .then(RegexBuilder.charClass("0-9A-Fa-f").exactly(2))
  .group("macAddress");

/**
 * Matches decimal numbers
 * Examples: "3.14", "0.5", ".75"
 * Use for: decimal/float input validation
 */
export const decimal = digit()
  .zeroOrMore()
  .then(RegexBuilder.lit("."))
  .then(digit().oneOrMore())
  .group("decimal");

/**
 * Matches signed numbers (whole or decimal with optional sign)
 * Examples: "-123", "+45.67", "89", "-0.5"
 * Use for: numeric input with optional sign
 */
export const signedNumber = RegexBuilder.charClass("+-")
  .optional()
  .then(digit().zeroOrMore())
  .then(RegexBuilder.lit(".").then(digit().oneOrMore()).optional())
  .group("signedNum");

/**
 * Matches HTML tags (opening and closing)
 * Examples: "<div>content</div>", "<span>text</span>"
 * Use for: HTML tag detection/extraction
 * Note: Simplified pattern, doesn't handle all edge cases
 */
export const htmlTag = RegexBuilder.lit("<")
  .then(
    RegexBuilder.charClass("A-Z").then(
      RegexBuilder.charClass("A-Z0-9").zeroOrMore()
    )
  )
  .then(RegexBuilder.charClass(">", true).zeroOrMore())
  .then(RegexBuilder.lit(">"))
  .then(RegexBuilder.raw(".*?")) // Non-greedy content match
  .then(RegexBuilder.lit("</"))
  .then(
    RegexBuilder.charClass("A-Z").then(
      RegexBuilder.charClass("A-Z0-9").zeroOrMore()
    )
  )
  .then(RegexBuilder.lit(">"))
  .group("htmlTag");

/**
 * Matches Windows file paths
 * Examples: "C:\\Windows\\System32", "D:\\Users\\Documents\\file.txt"
 * Use for: Windows path validation
 */
export const windowsPath = RegexBuilder.charClass("A-Z")
  .then(RegexBuilder.lit(":"))
  .then(RegexBuilder.charClass('\\\\/:*?"<>|\\r\\n', true).oneOrMore())
  .group("winPath");

/**
 * Matches domain names (without protocol)
 * Examples: "example.com", "sub.domain.co.uk"
 * Use for: domain validation
 */
export const domain = RegexBuilder.charClass("a-zA-Z0-9-")
  .oneOrMore()
  .then(RegexBuilder.lit("."))
  .oneOrMore()
  .then(RegexBuilder.charClass("a-z").between(2, 10))
  .group("domain");

/**
 * Matches international phone numbers (basic: +country digits)
 * Examples: "+1 555-123-4567", "+44 20 7123 4567", "+81 3-1234-5678"
 * Use for: international phone format validation
 */
export const intlPhone = RegexBuilder.lit("+")
  .then(digit().between(1, 3))
  .then(RegexBuilder.charClass(" -").optional())
  .then(digit().between(4, 14))
  .then(
    RegexBuilder.lit("x")
      .then(RegexBuilder.charClass("0-9 ").oneOrMore())
      .optional() // Extension
  )
  .group("intlPhone");

/**
 * Matches ISO country codes (2 letters)
 * Examples: "US", "GB", "JP", "DE"
 * Use for: country code validation
 */
export const isoCountryCode = RegexBuilder.charClass("A-Z")
  .exactly(2)
  .group("countryCode");

/**
 * Matches generic postal codes (alphanumeric, length 3-10)
 * Examples: "12345", "SW1A 1AA", "K1A 0B1"
 * Use for: postal code validation
 */
export const postalCode = RegexBuilder.charClass("A-Z0-9 \\-")
  .between(3, 10)
  .group("postalCode");

/**
 * Matches filename extensions (whitelist: jpg, png, pdf)
 * Examples: "document.pdf", "image.jpg", "photo.png"
 * Use for: file upload validation
 */
export const filenameExtWhitelist = RegexBuilder.charClass("a-zA-Z0-9,\\s-")
  .oneOrMore()
  .then(RegexBuilder.lit("."))
  .then(
    RegexBuilder.alt(
      RegexBuilder.lit("jpg"),
      RegexBuilder.lit("png"),
      RegexBuilder.lit("pdf")
    )
  )
  .group("filenameExt");

/**
 * Matches whitelisted characters (custom safe set)
 * Allows: letters, numbers, @ . - _
 * Examples: "user@domain.com", "test-user_123", "data.file"
 * Use for: strict input validation
 */
export const whitelistSimple = RegexBuilder.charClass("A-Za-z0-9@.\\-_")
  .oneOrMore()
  .group("whitelist");

/**
 * Rejects dangerous characters (blocklist approach)
 * Blocks: < > ; ' " \
 * Use for: preventing XSS and injection attempts
 * Note: This is a negative pattern - matches SAFE input
 */
export const noDangerousChars = RegexBuilder.charClass("<>;'\"\\\\", true)
  .oneOrMore()
  .group("noDangerous");

/**
 * Registry of all security patterns
 */
export const SECURITY_PATTERNS = {
  alphanumeric: {
    pattern: alphanumeric,
    description: "Matches alphanumeric characters only (no spaces)",
    examples: ["abc123", "Test42", "User1"],
    dialect: "universal" as const,
  },
  alphanumericWithSpaces: {
    pattern: alphanumericWithSpaces,
    description: "Matches alphanumeric with spaces",
    examples: ["Hello World", "User 123", "Test Data"],
    dialect: "universal" as const,
  },
  safeText: {
    pattern: safeText,
    description:
      "Matches safe simple text (letters, numbers, space, basic punctuation)",
    examples: ["Hello, World!", "Test-123", "User's data"],
    dialect: "universal" as const,
  },
  sqlMetaChars: {
    pattern: sqlMetaChars,
    description: "Detects typical SQL meta-characters (for scanning/flagging)",
    examples: ["'", "--", "#", "%27", "%23"],
    dialect: "universal" as const,
  },
  hostname: {
    pattern: hostname,
    description: "Matches valid hostname/domain labels",
    examples: ["example", "my-server", "web01"],
    dialect: "universal" as const,
  },
  safeFilename: {
    pattern: safeFilename,
    description: "Matches safe filenames (no path traversal chars)",
    examples: ["document.txt", "my-file.pdf", "data_2024.csv"],
    dialect: "universal" as const,
  },
  usSSN: {
    pattern: usSSN,
    description: "Matches US Social Security Number (AAA-GG-SSSS format)",
    examples: ["123-45-6789", "987-65-4321"],
    dialect: "universal" as const,
  },
  creditCard: {
    pattern: creditCard,
    description:
      "Matches credit card numbers (13-16 digits, with optional spaces/hyphens)",
    examples: ["4532-1488-0343-6467", "4532 1488 0343 6467"],
    dialect: "universal" as const,
  },
  macAddress: {
    pattern: macAddress,
    description: "Matches MAC addresses (six hex pairs separated by : or -)",
    examples: ["00:1A:2B:3C:4D:5E", "00-1A-2B-3C-4D-5E"],
    dialect: "universal" as const,
  },
  decimal: {
    pattern: decimal,
    description: "Matches decimal numbers",
    examples: ["3.14", "0.5", ".75"],
    dialect: "universal" as const,
  },
  signedNumber: {
    pattern: signedNumber,
    description: "Matches signed numbers (whole or decimal with optional sign)",
    examples: ["-123", "+45.67", "89", "-0.5"],
    dialect: "universal" as const,
  },
  htmlTag: {
    pattern: htmlTag,
    description: "Matches HTML tags (opening and closing)",
    examples: ["<div>content</div>", "<span>text</span>"],
    dialect: "universal" as const,
  },
  windowsPath: {
    pattern: windowsPath,
    description: "Matches Windows file paths",
    examples: ["C:\\Windows\\System32", "D:\\Users\\Documents\\file.txt"],
    dialect: "universal" as const,
  },
  domain: {
    pattern: domain,
    description: "Matches domain names (without protocol)",
    examples: ["example.com", "sub.domain.co.uk"],
    dialect: "universal" as const,
  },
  intlPhone: {
    pattern: intlPhone,
    description: "Matches international phone numbers (basic: +country digits)",
    examples: ["+1 555-123-4567", "+44 20 7123 4567"],
    dialect: "universal" as const,
  },
  isoCountryCode: {
    pattern: isoCountryCode,
    description: "Matches ISO country codes (2 letters)",
    examples: ["US", "GB", "JP", "DE"],
    dialect: "universal" as const,
  },
  postalCode: {
    pattern: postalCode,
    description: "Matches generic postal codes (alphanumeric, length 3-10)",
    examples: ["12345", "SW1A 1AA", "K1A 0B1"],
    dialect: "universal" as const,
  },
  filenameExtWhitelist: {
    pattern: filenameExtWhitelist,
    description: "Matches filename extensions (whitelist: jpg, png, pdf)",
    examples: ["document.pdf", "image.jpg", "photo.png"],
    dialect: "universal" as const,
  },
  whitelistSimple: {
    pattern: whitelistSimple,
    description: "Matches whitelisted characters (custom safe set)",
    examples: ["user@domain.com", "test-user_123", "data.file"],
    dialect: "universal" as const,
  },
  noDangerousChars: {
    pattern: noDangerousChars,
    description: "Rejects dangerous characters (blocklist approach)",
    examples: ["safe text", "no-dangerous-chars", "valid_input"],
    dialect: "universal" as const,
  },
} as const;

export type SecurityPatternName = keyof typeof SECURITY_PATTERNS;
