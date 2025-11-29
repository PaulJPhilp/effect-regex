/**
 * Common Regex Patterns for Input Validation
 *
 * This module provides a curated set of ~50 pre-built regex patterns for common validation scenarios.
 * These patterns are derived from standard regex cheat-sheets and security best practices.
 *
 * ⚠️ IMPORTANT SECURITY NOTES:
 * - Regex alone is NOT sufficient for security controls
 * - Always combine with proper sanitization, prepared statements, and output encoding
 * - Test for ReDoS (Regex Denial of Service) vulnerabilities in your environment
 * - Prefer whitelisting over blacklisting approaches
 * - Validate against your specific locale and business requirements
 *
 * @author Generated for effect-regex project
 * @version 1.0.0
 */

// ========================================
// BASIC & COMMON VALIDATION PATTERNS
// ========================================

/**
 * Email address (basic validation)
 * Matches: user@domain.com, user.name+tag@sub.domain.org
 * Does NOT validate: actual deliverability, international domains
 */
export const PATTERN_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * HTTP/HTTPS URL (simple validation)
 * Matches: https://example.com, http://www.example.com/path?query=value
 * Does NOT validate: URL reachability or scheme security
 */
export const PATTERN_URL =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#()?&//=]*)/;

/**
 * IPv4 address
 * Matches: 192.168.1.1, 10.0.0.1, 172.16.0.1
 * Validates octet ranges (0-255) properly
 */
export const PATTERN_IPV4 =
  /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

/**
 * IPv6 address (simplified)
 * Matches: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
 * Note: This is a basic pattern; full IPv6 validation is more complex
 */
export const PATTERN_IPV6 = /^[A-Fa-f0-9]{1,4}(:[A-Fa-f0-9]{1,4}){7}$/;

/**
 * Alphanumeric characters only (no spaces)
 * Matches: abc123, TestCase456
 * Blocks: spaces, punctuation, special characters
 */
export const PATTERN_ALPHANUM = /^[a-zA-Z0-9]+$/;

/**
 * Alphanumeric with spaces allowed
 * Matches: "hello world 123", "Test Case 456"
 * Allows: letters, numbers, spaces
 */
export const PATTERN_ALPHANUM_SPACE = /^[a-zA-Z0-9 ]+$/;

/**
 * Strong password validation
 * Requires: min 8 chars, 1 lowercase, 1 uppercase, 1 number, 1 special character
 * Matches: "Password123!", "Secure#456"
 */
export const PATTERN_PASSWORD_STRONG =
  /(?=(.*[0-9]))(?=(.*[!@#$%^&*()\\[\]{}\-_+=~`|:;"'<>,./?]))(?=(.*[a-z]))(?=(.*[A-Z])).{8,}/;

/**
 * Username validation
 * Allows: letters, numbers, underscore, hyphen (3-16 characters)
 * Matches: "user_name", "test-user123"
 */
export const PATTERN_USERNAME = /^[a-zA-Z0-9_-]{3,16}$/;

/**
 * Date in YYYY-MM-DD format
 * Matches: "2024-12-25", "1999-01-01"
 * Validates: year (1000-2999), month (01-12), day (01-31)
 */
export const PATTERN_DATE_YYYY_MM_DD =
  /^[12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * US phone number (basic)
 * Matches: "555-123-4567", "555.123.4567", "555 123 4567", "5551234567"
 * Does NOT validate: area code rules, international formats
 */
export const PATTERN_US_PHONE = /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/;

// ========================================
// SECURITY-FOCUSED PATTERNS
// ========================================

/**
 * Safe text input (whitelist approach)
 * Allows: letters, numbers, spaces, basic punctuation
 * Blocks: HTML tags, script injection attempts, dangerous characters
 */
export const PATTERN_SAFE_TEXT = /^[a-zA-Z0-9 .,\-_'"]+$/;

/**
 * SQL injection detection pattern
 * DETECTS: common SQL injection meta-characters
 * Note: This is for detection only, NOT a complete defense
 * Use prepared statements instead of regex for SQL security
 */
export const PATTERN_SQL_META = /(%27)|(')|(--)|(%23)|(#)/i;

/**
 * Safe hostname/domain validation
 * Matches: "example", "sub-domain", "test123"
 * Blocks: leading/trailing hyphens, invalid characters
 */
export const PATTERN_HOSTNAME = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

/**
 * Safe filename validation
 * Blocks: path traversal, dangerous characters, control characters
 * Allows: standard filename characters
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: control chars are intentional for matching
export const PATTERN_SAFE_FILENAME = /^[^<>:"\\/|?*\u0000-\u001F]+$/;

/**
 * Hex color code validation
 * Matches: "#RGB", "#RRGGBB" (case insensitive)
 * Examples: "#F00", "#FF0000", "#123ABC"
 */
export const PATTERN_HEX_COLOR = /^#(?:[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * US Social Security Number format
 * Matches: "123-45-6789"
 * Does NOT validate: actual SSN rules or checksums
 */
export const PATTERN_US_SSN = /^\d{3}-\d{2}-\d{4}$/;

/**
 * Credit card number (basic format)
 * Matches: 13-16 digits with optional spaces/hyphens
 * Does NOT validate: actual card numbers, checksums, or issuer identification
 */
export const PATTERN_CREDIT_CARD = /\b(?:\d[ -]*?){13,16}\b/;

/**
 * MAC address validation
 * Matches: "00:11:22:33:44:55" or "00-11-22-33-44-55"
 * Case insensitive, colons or hyphens as separators
 */
export const PATTERN_MAC_ADDRESS = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

// ========================================
// EXTENDED PATTERNS
// ========================================

/**
 * Integer numbers only
 * Matches: "123", "-456", "0"
 */
export const PATTERN_INTEGER = /^-?\d+$/;

/**
 * Decimal numbers
 * Matches: "123.45", "-67.89", "0.5"
 */
export const PATTERN_DECIMAL = /^-?\d*\.\d+$/;

/**
 * Whole or decimal numbers with optional sign
 * Matches: "123", "-45.67", "0.5", "-0"
 */
export const PATTERN_NUMBER = /^-?\d*(\.\d+)?$/;

/**
 * HTML tag extraction (basic)
 * Captures: tag name and content
 * Note: Not suitable for complex HTML parsing
 */
export const PATTERN_HTML_TAG = /<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/i;

/**
 * Windows file path
 * Matches: "C:\folder\file.txt", "D:\data\file.pdf"
 * Validates drive letter and path structure
 */
export const PATTERN_WINDOWS_PATH =
  /^[A-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/;

/**
 * URL domain without protocol
 * Matches: "example.com", "sub.domain.org"
 */
export const PATTERN_DOMAIN = /^(?:[a-zA-Z0-9-]+\.)+[a-z]{2,}$/;

/**
 * International phone number (basic)
 * Matches: "+1234567890", "+44 20 1234 5678"
 */
export const PATTERN_INTL_PHONE = /^\+\d{1,3}\s?\d{4,14}(?:x.+)?$/;

/**
 * Time in HH:MM:SS format (24-hour)
 * Matches: "23:59:59", "00:00:00", "12:30:45"
 */
export const PATTERN_TIME_HH_MM_SS = /^(2[0-3]|[01]\d):[0-5]\d:[0-5]\d$/;

/**
 * UUID v4 format
 * Matches: "550e8400-e29b-41d4-a716-446655440000"
 */
export const PATTERN_UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * JSON key extraction
 * Captures: "keyName" from JSON-like structures
 */
export const PATTERN_JSON_KEY = /"(\w+)":/g;

/**
 * HTML color code (short or long form)
 * Matches: "#RGB" or "#RRGGBB" (case insensitive)
 */
export const PATTERN_HTML_COLOR = /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

/**
 * Unicode username (international characters)
 * Allows: Unicode letters, numbers, underscore, hyphen (3-20 chars)
 * Requires: Unicode flag /u when used
 */
export const PATTERN_UNICODE_USERNAME = /^[\p{L}\p{N}_-]{3,20}$/u;

/**
 * Safe URL path (no query parameters)
 * Matches: "/api/users", "/static/css/style.css"
 * Blocks: query strings, fragments, dangerous characters
 */
export const PATTERN_SAFE_URL_PATH = /^\/[A-Za-z0-9/\-_]+$/;

/**
 * Open redirect prevention (example for yourdomain.com)
 * Replace 'yourdomain\.com' with your actual domain
 * Matches: "https://www.yourdomain.com/path"
 */
export const PATTERN_OPEN_REDIRECT_CHECK =
  /^https?:\/\/(?:www\.)?yourdomain\.com\//;

/**
 * Private IP detection in URLs
 * DETECTS: private IP ranges in URLs (for blocking)
 * Matches URLs containing private IPs: 10.x.x.x, 192.168.x.x, etc.
 */
export const PATTERN_PRIVATE_IP_URL =
  /https?:\/\/(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)\d+/;

/**
 * HTML tag stripper (basic)
 * REMOVES: HTML tags (not secure for XSS prevention)
 * Note: Use proper HTML sanitization libraries instead
 */
export const PATTERN_HTML_STRIP = /<[^>]+>/g;

/**
 * Script tag detection
 * DETECTS: <script> tags and their content
 * For security monitoring, not content filtering
 */
export const PATTERN_SCRIPT_TAG =
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * ISO country code (2 letters)
 * Matches: "US", "GB", "FR", "DE"
 */
export const PATTERN_ISO_COUNTRY = /^[A-Z]{2}$/;

/**
 * Generic postal code
 * Matches: alphanumeric codes with spaces/hyphens (3-10 chars)
 * Adapt for specific country formats
 */
export const PATTERN_POSTAL_CODE = /^[A-Z0-9\s-]{3,10}$/i;

/**
 * Filename with extension validation
 * Allows: jpg, png, pdf extensions (case insensitive)
 * Matches: "document.pdf", "image.JPG", "photo.png"
 */
export const PATTERN_FILENAME_EXT = /^[\w,\s-]+\.(?:jpg|png|pdf)$/i;

/**
 * Custom whitelisted characters
 * Allows: alphanumeric, @, dot, underscore, hyphen
 * Adapt the character class for your specific needs
 */
export const PATTERN_WHITELIST_CHARS = /^[A-Za-z0-9@.\-_]+$/;

/**
 * Dangerous character detection
 * DETECTS: potentially dangerous characters for input validation
 * Use as part of a defense-in-depth strategy
 */
export const PATTERN_DANGEROUS_CHARS = /^[^<>;'"\\]+$/;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Type-safe pattern tester function
 * @param pattern - The regex pattern to test
 * @param input - String to test against the pattern
 * @returns boolean indicating if the pattern matches
 */
export function testPattern(pattern: RegExp, input: string): boolean {
  return pattern.test(input);
}

/**
 * Extract matches from a string using a pattern
 * @param pattern - Regex pattern with global flag for multiple matches
 * @param input - String to search in
 * @returns Array of matched strings
 */
export function extractMatches(pattern: RegExp, input: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global patterns
  pattern.lastIndex = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: necessary for exec loop
  while ((match = pattern.exec(input)) !== null) {
    matches.push(match[0]);
    // Prevent infinite loops on zero-width matches
    if (pattern.lastIndex === match.index) {
      pattern.lastIndex++;
    }
  }

  return matches;
}

/**
 * Validate input against multiple patterns
 * @param input - String to validate
 * @param patterns - Array of patterns to test against
 * @returns Object with validation results
 */
export function validateAgainstPatterns(
  input: string,
  patterns: Array<{ name: string; pattern: RegExp; shouldMatch: boolean }>
): {
  valid: boolean;
  failures: Array<{ pattern: string; expected: boolean; actual: boolean }>;
} {
  const failures: Array<{
    pattern: string;
    expected: boolean;
    actual: boolean;
  }> = [];

  for (const { name, pattern, shouldMatch } of patterns) {
    const matches = pattern.test(input);
    if (matches !== shouldMatch) {
      failures.push({
        pattern: name,
        expected: shouldMatch,
        actual: matches,
      });
    }
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

// ========================================
// USAGE EXAMPLES
// ========================================

/*
// Example: Email validation
import { testPattern, PATTERN_EMAIL } from './common-regex-patterns';

function isValidEmail(email: string): boolean {
  return testPattern(PATTERN_EMAIL, email);
}

// Example: Multi-pattern validation
import { validateAgainstPatterns, PATTERN_EMAIL, PATTERN_SAFE_TEXT } from './common-regex-patterns';

function validateUserInput(email: string, description: string): boolean {
  const emailValidation = validateAgainstPatterns(email, [
    { name: 'email', pattern: PATTERN_EMAIL, shouldMatch: true }
  ]);

  const descriptionValidation = validateAgainstPatterns(description, [
    { name: 'safe-text', pattern: PATTERN_SAFE_TEXT, shouldMatch: true }
  ]);

  return emailValidation.valid && descriptionValidation.valid;
}

// Example: Security scanning
import { extractMatches, PATTERN_SQL_META, PATTERN_SCRIPT_TAG } from './common-regex-patterns';

function scanForSecurityIssues(input: string): string[] {
  const sqlMatches = extractMatches(PATTERN_SQL_META, input);
  const scriptMatches = extractMatches(PATTERN_SCRIPT_TAG, input);

  return [...sqlMatches, ...scriptMatches];
}
*/
