# Pattern Library Documentation

The effect-regex standard library provides a comprehensive collection of pre-built regex patterns using the RegexBuilder fluent API.

## Pattern Categories

### General Patterns (`src/std/patterns.ts`)

Common validation patterns for everyday use:

- **Email**: Basic email validation
- **URL**: HTTP/HTTPS URL validation
- **Username**: Alphanumeric with underscore/hyphen (3-16 chars)
- **Password**: Strong password validation
- **UUID v4**: Standard UUID format
- **Semantic Version**: SemVer format (1.0.0, 2.1.3-alpha, etc.)
- **Colors**: Hex colors and comprehensive CSS colors
- **Phone Numbers**: US phone format
- **IP Addresses**: IPv4 and IPv6 (compressed)
- **Dates/Times**: ISO date, ISO datetime, HH:MM:SS
- **Numbers**: Integers, floats, decimals
- **File Paths**: Basic path matching

### Security Patterns (`src/std/security-patterns.ts`)

Security-focused patterns for input validation and sanitization:

- **Alphanumeric**: With and without spaces
- **Safe Text**: Letters, numbers, basic punctuation only
- **SQL Meta Detection**: Detects SQL injection attempts
- **Hostname**: Valid hostname labels
- **Safe Filename**: No path traversal characters
- **SSN**: US Social Security Number format
- **Credit Card**: Basic format validation
- **MAC Address**: Six hex pairs format
- **Domain**: Domain name validation
- **International Phone**: +country code format
- **Country Codes**: ISO 2-letter codes
- **Postal Codes**: Generic format
- **Whitelisting**: Custom safe character sets
- **Blacklisting**: Reject dangerous characters

## Usage Examples

### Basic Usage

```typescript
import { email, username, ipv4 } from "effect-regex/std";
import { emit } from "effect-regex/core/builder";

// Use a pre-built pattern
const emailPattern = emit(email, "js", true); // anchored
console.log(emailPattern.pattern);
// Output: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}(?<email>)$

// Test the pattern
const regex = new RegExp(emailPattern.pattern);
console.log(regex.test("user@example.com")); // true
console.log(regex.test("invalid.email")); // false
```

### Using Security Patterns

```typescript
import { safeFilename, sqlMetaChars } from "effect-regex/std/security-patterns";
import { emit } from "effect-regex/core/builder";

// Validate filename is safe
const filenamePattern = emit(safeFilename, "js", true);
const regex = new RegExp(filenamePattern.pattern);
console.log(regex.test("document.pdf")); // true
console.log(regex.test("../../../etc/passwd")); // false

// Detect SQL injection attempts
const sqlPattern = emit(sqlMetaChars, "js");
const sqlRegex = new RegExp(sqlPattern.pattern);
console.log(sqlRegex.test("normal input")); // false
console.log(sqlRegex.test("'; DROP TABLE users--")); // true
```

### Pattern Discovery

```typescript
import { searchPatterns, getPattern, listPatterns } from "effect-regex/std";

// Search for patterns
const phonePatterns = searchPatterns("phone");
console.log(phonePatterns);
// Output: ["usPhone", "intlPhone"]

// Get a specific pattern
const uuidPattern = getPattern("uuidV4");
console.log(uuidPattern.description);
console.log(uuidPattern.examples);

// List all available patterns
const allPatterns = listPatterns();
console.log(`${allPatterns.length} patterns available`);
```

### Customizing Patterns

All patterns are built using RegexBuilder, so you can extend them:

```typescript
import { username } from "effect-regex/std";
import { RegexBuilder } from "effect-regex/core/builder";
import { emit } from "effect-regex/core/builder";

// Add email domain requirement to username
const usernameWithDomain = username
  .then(RegexBuilder.lit("@"))
  .then(RegexBuilder.charClass("a-z").between(2, 10));

const pattern = emit(usernameWithDomain, "js", true);
```

### TryCapture with Validation

Use TryCapture for patterns that need validation metadata:

```typescript
import { RegexBuilder } from "effect-regex/core/builder";
import { emit } from "effect-regex/core/builder";

// Email with validation metadata
const emailWithValidation = RegexBuilder.charClass("a-zA-Z0-9._%+-")
  .oneOrMore()
  .then(RegexBuilder.lit("@"))
  .then(RegexBuilder.charClass("a-zA-Z0-9.-").oneOrMore())
  .then(RegexBuilder.lit("."))
  .then(RegexBuilder.charClass("a-zA-Z").between(2, 10))
  .tryCapture("email", {
    description: "must be valid email format",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,10}$"
  });

const result = emit(emailWithValidation, "js");
console.log(result.notes);
// Output: ["TryCapture validation: must be valid email format (pattern: ...)"]
```

## Pattern Reference

### General Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `email` | Email address validation | `user@example.com` |
| `url` | HTTP/HTTPS URL | `https://example.com/path` |
| `username` | Alphanumeric username | `user_name-123` |
| `passwordStrong` | Strong password | `Password123!` |
| `uuidV4` | UUID v4 format | `123e4567-e89b-12d3-a456-426614174000` |
| `semverStrict` | Semantic version | `1.0.0-alpha.1` |
| `hexColor` | Hex color code | `#FF0000` |
| `cssColor` | CSS color value | `rgb(255,0,0)` |
| `usPhone` | US phone number | `555-123-4567` |
| `ipv4` | IPv4 address | `192.168.1.1` |
| `ipv6Compressed` | IPv6 address | `2001:db8::1` |
| `isoDate` | ISO date format | `2023-12-25` |
| `isoDateTime` | ISO datetime | `2023-12-25T10:30:00.000Z` |
| `integer` | Integer number | `42`, `-123` |
| `float` | Floating point | `3.14`, `-0.5` |

### Security Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `alphanumeric` | Alphanumeric only | `abc123` |
| `alphanumericWithSpaces` | Alphanumeric with spaces | `Hello World` |
| `safeText` | Safe text with basic punctuation | `Hello, World!` |
| `sqlMetaChars` | SQL injection detection | `'`, `--`, `#` |
| `hostname` | Valid hostname | `my-server` |
| `safeFilename` | Safe filename | `document.pdf` |
| `usSSN` | US SSN format | `123-45-6789` |
| `creditCard` | Credit card format | `4532-1488-0343-6467` |
| `macAddress` | MAC address | `00:1A:2B:3C:4D:5E` |
| `domain` | Domain name | `example.com` |
| `intlPhone` | International phone | `+1 555-123-4567` |
| `isoCountryCode` | ISO country code | `US`, `GB` |
| `postalCode` | Postal code | `12345`, `SW1A 1AA` |
| `whitelistSimple` | Whitelisted characters | `user@domain.com` |
| `noDangerousChars` | No dangerous chars | `safe-input` |

## Best Practices

1. **Always anchor patterns** for input validation: `emit(pattern, "js", true)`
2. **Use tryCapture** for patterns that need validation metadata
3. **Choose the right dialect** for your runtime environment
4. **Combine patterns** using RegexBuilder methods for complex validation
5. **Test patterns** thoroughly with both valid and invalid inputs
6. **Use security patterns** for user input to prevent injection attacks

## See Also

- [RegexBuilder API Documentation](./builder-api.md)
- [TryCapture Guide](./trycapture.md)
- [Dialect Support](./dialects.md)
