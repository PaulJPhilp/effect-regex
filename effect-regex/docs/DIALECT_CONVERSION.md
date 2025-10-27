# Regex Dialect Conversion

The `convert_regex` MCP tool provides best-effort conversion between regex dialects (JavaScript, RE2, PCRE).

## Supported Dialects

- **js**: JavaScript (ECMAScript) regex
- **re2**: Google RE2 (limited feature set, no backtracking)
- **pcre**: Perl Compatible Regular Expressions

## Feature Compatibility Matrix

| Feature | JavaScript | RE2 | PCRE |
|---------|-----------|-----|------|
| Named Groups `(?<name>...)` | ✅ | ❌ | ✅ |
| Backreferences `\1`, `\k<name>` | ✅ | ❌ | ✅ |
| Lookbehind `(?<=...)`, `(?<!...)` | ✅ | ❌ | ✅ |
| Lookahead `(?=...)`, `(?!...)` | ✅ | ❌* | ✅ |

*RE2 supports lookahead in limited contexts only.

## Conversion Strategies

### JavaScript → RE2

When converting from JavaScript to RE2, incompatible features are handled as follows:

- **Named Groups**: Converted to regular capturing groups `(...)`
- **Backreferences**: Replaced with `.*?` (non-greedy wildcard)
- **Lookbehind**: Removed entirely
- **Lookahead**: Removed entirely

**Example:**
```
Input (JS):  (?<year>\d{4})-(?<month>\d{2})
Output (RE2): (\d{4})-(\d{2})
```

**Example with backreferences:**
```
Input (JS):  (\w+)\s+\1
Output (RE2): (\w+)\s+.*?
```

### RE2 → JavaScript

RE2 patterns work directly in JavaScript (RE2 is a subset).

```
Input (RE2): \d{3}-\d{4}
Output (JS):  \d{3}-\d{4}
```

### JavaScript ↔ PCRE

Most JavaScript patterns work in PCRE and vice versa. Warnings are issued for potential Unicode feature differences.

## Limitations

### String-Based Conversion

The converter operates on regex **strings**, not AST. This means:

- **No full parsing**: Complex nested structures may not be handled correctly
- **Heuristic detection**: Features are detected using regex patterns
- **Best-effort only**: Manual review recommended for complex patterns

### Known Issues

1. **Nested Constructs**: Patterns with deeply nested groups or assertions may not convert correctly
   ```regex
   (?:(?:nested)+)+  // May not be handled perfectly
   ```

2. **Unbalanced Parentheses**: Detection relies on simple pattern matching
   ```regex
   \(literal paren  // May confuse feature detection
   ```

3. **Complex Assertions**: Lookbehind/lookahead with complex content may leave artifacts
   ```regex
   (?<=\d{2,4})test  // Simplified removal may not be perfect
   ```

4. **Character Class Interactions**: Character classes within assertions
   ```regex
   (?<=[a-z]{3})  // Removal may not preserve semantics
   ```

## Best Practices

### When to Use Conversion

✅ **Good candidates:**
- Simple patterns with basic features
- Patterns with isolated incompatibilities
- Quick dialect compatibility checks

❌ **Poor candidates:**
- Highly complex nested patterns
- Patterns with critical lookaround logic
- Patterns where exact semantics must be preserved

### Validation Workflow

1. **Convert** the pattern using `convert_regex`
2. **Review** the `warnings` and `incompatibilities` in the result
3. **Test** the converted pattern with your test cases
4. **Manually adjust** if needed based on warnings

### Using `allowDowngrades`

```json
{
  "pattern": "(?<num>\\d+)",
  "toDialect": "re2",
  "allowDowngrades": true  // Allow lossy conversion
}
```

- `allowDowngrades: true` (default): Converts with feature removal
- `allowDowngrades: false`: Fails if incompatible features detected

## Output Format

```json
{
  "originalPattern": "(?<year>\\d{4})",
  "pattern": "(\\d{4})",
  "fromDialect": "js",
  "toDialect": "re2",
  "success": true,
  "changed": true,
  "notes": [
    "Converting to RE2 (limited feature set)",
    "Converted named groups (?<name>...) to regular groups (...)"
  ],
  "warnings": [
    "Named groups removed (not supported in RE2)"
  ],
  "incompatibilities": [],
  "limitations": [
    "String-based conversion (no full regex parser)",
    "Complex patterns may require manual review",
    "Heuristic feature detection may miss some cases",
    "Nested constructs may not be handled correctly"
  ]
}
```

## Future Improvements

Full regex string → AST parsing is planned for post-1.0, which will enable:

- **Accurate nested structure handling**
- **Precise feature detection**
- **Semantic-preserving transformations**
- **Better error reporting**

## Examples

### Example 1: Email Pattern (JS → RE2)

```
Input:  [a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}
Output: [a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}
Result: No changes needed (no incompatible features)
```

### Example 2: UUID with Named Groups (JS → RE2)

```
Input:  (?<uuid>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})
Output: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})
Result: Named group converted to regular group
```

### Example 3: Lookbehind Password Check (JS → RE2)

```
Input:  (?=.*[A-Z])(?=.*[0-9]).{8,}
Output: .{8,}
Result: Lookahead assertions removed (lossy)
Warning: Pattern semantics changed significantly
```

## Recommendations

1. **Start Simple**: Test conversion with simple patterns first
2. **Use Test Cases**: Always validate converted patterns with test cases
3. **Review Warnings**: Pay attention to all warnings and notes
4. **Prefer AST**: For complex conversions, use the AST-based builder API instead
5. **Document Changes**: Note any manual adjustments needed after conversion

## Support

For issues or questions about dialect conversion:
- Check the `warnings` and `notes` in the response
- Review this documentation
- File an issue if you find a pattern that should convert but doesn't
- Consider using the AST-based builder for precise dialect control
