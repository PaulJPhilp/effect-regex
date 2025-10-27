import { describe, expect, it } from "@effect/vitest";
import { convertDialect } from "../src/mcp/converter.js";

describe("Dialect Converter", () => {
  describe("Same dialect (no conversion)", () => {
    it("should return unchanged pattern for same dialect", () => {
      const result = convertDialect("\\d+", "js", "js");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("\\d+");
      expect(result.notes).toContain("No conversion needed - same dialect");
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Invalid source patterns", () => {
    it("should detect invalid source pattern", () => {
      const result = convertDialect("(unclosed", "js", "re2");

      expect(result.success).toBe(false);
      expect(result.incompatibilities.length).toBeGreaterThan(0);
      expect(result.incompatibilities[0]).toContain("Invalid source pattern");
    });
  });

  describe("JS to RE2 conversion", () => {
    it("should convert simple pattern without changes", () => {
      const result = convertDialect("\\d{3}-\\d{4}", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("\\d{3}-\\d{4}");
      expect(result.changed).toBe(false);
    });

    it("should remove named groups when converting to RE2", () => {
      const result = convertDialect(
        "(?<year>\\d{4})-(?<month>\\d{2})",
        "js",
        "re2"
      );

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("(\\d{4})-(\\d{2})");
      expect(result.changed).toBe(true);
      expect(result.warnings).toContain(
        "Named groups removed (not supported in RE2)"
      );
      expect(result.notes).toContain(
        "Converted named groups (?<name>...) to regular groups (...)"
      );
    });

    it("should remove backreferences when converting to RE2", () => {
      const result = convertDialect("(\\w+)\\s+\\1", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("\\1");
      expect(result.pattern).toContain(".*?");
      expect(result.changed).toBe(true);
      expect(result.warnings).toContain(
        "Backreferences replaced with .*? (not supported in RE2)"
      );
    });

    it("should remove named backreferences when converting to RE2", () => {
      const result = convertDialect("(?<word>\\w+)\\s+\\k<word>", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("\\k<word>");
      expect(result.pattern).toContain(".*?");
      expect(result.changed).toBe(true);
    });

    it("should remove lookbehind assertions when converting to RE2", () => {
      const result = convertDialect("(?<=start)\\d+", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("(?<=");
      expect(result.changed).toBe(true);
      expect(result.warnings).toContain(
        "Lookbehind assertions removed (not supported in RE2)"
      );
    });

    it("should remove negative lookbehind assertions when converting to RE2", () => {
      const result = convertDialect("(?<!not)\\d+", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("(?<!");
      expect(result.changed).toBe(true);
    });

    it("should remove lookahead assertions when converting to RE2", () => {
      const result = convertDialect("\\d+(?=end)", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("(?=");
      expect(result.changed).toBe(true);
      expect(result.warnings).toContain(
        "Lookahead assertions removed (not supported in RE2)"
      );
    });

    it("should remove negative lookahead assertions when converting to RE2", () => {
      const result = convertDialect("\\d+(?!bad)", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("(?!");
      expect(result.changed).toBe(true);
    });

    it("should handle multiple incompatible features", () => {
      const result = convertDialect(
        "(?<num>\\d+)(?=end)\\s+\\k<num>",
        "js",
        "re2"
      );

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(1);
      expect(result.pattern).not.toContain("(?<num>");
      expect(result.pattern).not.toContain("(?=end)");
      expect(result.pattern).not.toContain("\\k<num>");
    });

    it("should fail conversion when allowDowngrades=false and incompatibilities exist", () => {
      const result = convertDialect(
        "(?<name>\\w+)",
        "js",
        "re2",
        false // disallow downgrades
      );

      expect(result.success).toBe(false);
      expect(result.incompatibilities).toContain(
        "Named groups not supported in RE2"
      );
      expect(result.pattern).toBe("(?<name>\\w+)"); // Unchanged
    });
  });

  describe("RE2 to JS conversion", () => {
    it("should convert simple RE2 pattern to JS", () => {
      const result = convertDialect("[a-z]+@[a-z]+\\.[a-z]{2,}", "re2", "js");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("[a-z]+@[a-z]+\\.[a-z]{2,}");
      expect(result.notes).toContain(
        "RE2 patterns should work in JavaScript (RE2 is a subset)"
      );
    });
  });

  describe("RE2 to PCRE conversion", () => {
    it("should convert RE2 pattern to PCRE", () => {
      const result = convertDialect("\\d{3}", "re2", "pcre");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("\\d{3}");
      expect(result.notes).toContain(
        "RE2 patterns should work in PCRE (RE2 is a subset)"
      );
    });
  });

  describe("JS to PCRE conversion", () => {
    it("should convert JS pattern to PCRE", () => {
      const result = convertDialect("(?<year>\\d{4})", "js", "pcre");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("(?<year>\\d{4})");
      expect(result.notes).toContain("Most JavaScript patterns work in PCRE");
    });

    it("should warn about potential Unicode feature differences", () => {
      const result = convertDialect("\\p{Letter}", "js", "pcre");

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(
        "Some JS-specific Unicode features may require PCRE equivalents"
      );
    });
  });

  describe("PCRE to JS conversion", () => {
    it("should convert PCRE pattern to JS", () => {
      const result = convertDialect("[a-z]{2,10}", "pcre", "js");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("[a-z]{2,10}");
    });

    it("should warn about PCRE-specific features", () => {
      const result = convertDialect("test", "pcre", "js");

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(
        "Some PCRE-specific features may not work in JavaScript"
      );
    });
  });

  describe("PCRE to RE2 conversion", () => {
    it("should remove incompatible features when converting PCRE to RE2", () => {
      const result = convertDialect(
        "(?<name>[a-z]+)\\s+\\k<name>",
        "pcre",
        "re2"
      );

      expect(result.success).toBe(true);
      expect(result.pattern).not.toContain("(?<name>");
      expect(result.pattern).not.toContain("\\k<name>");
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty pattern", () => {
      const result = convertDialect("", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("");
    });

    it("should handle pattern with no special features", () => {
      const result = convertDialect("hello.*world", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("hello.*world");
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle complex character classes", () => {
      const result = convertDialect("[a-zA-Z0-9_-]+", "js", "re2");

      expect(result.success).toBe(true);
      expect(result.pattern).toBe("[a-zA-Z0-9_-]+");
    });
  });

  describe("Conversion metadata", () => {
    it("should set changed=true when pattern is modified", () => {
      const result = convertDialect("(?<test>\\w+)", "js", "re2");

      expect(result.changed).toBe(true);
    });

    it("should set changed=false when pattern is unchanged", () => {
      const result = convertDialect("\\d+", "js", "re2");

      expect(result.changed).toBe(false);
    });

    it("should include appropriate notes for conversion type", () => {
      const result = convertDialect("test", "js", "re2");

      expect(result.notes).toContain("Converting to RE2 (limited feature set)");
    });
  });
});
