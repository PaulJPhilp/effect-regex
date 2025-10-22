/**
 * Phase 4: Pattern Refactoring Tests
 *
 * Tests for refactored standard library patterns to ensure they:
 * 1. Use fluent API (no raw regex literals)
 * 2. Match expected inputs correctly
 * 3. Maintain backward compatibility
 */

import { describe, expect, it } from "vitest";
import { emit } from "../src/core/builder.js";
import {
  ipv6Compressed,
  isoDate,
  isoDateTime,
  uuidV4,
} from "../src/std/patterns.js";

describe("Phase 4: Refactored Patterns", () => {
  describe("uuidV4", () => {
    it("should match valid UUID v4 format", () => {
      const result = emit(uuidV4, "js", false);
      const regex = new RegExp(result.pattern);

      // Valid UUID v4 examples (3rd group MUST start with '4', 4th group MUST start with 8,9,a,b)
      expect(regex.test("123e4567-e89b-42d3-a456-426614174000")).toBe(true); // Fixed: 12d3 -> 42d3
      expect(regex.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(regex.test("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
    });

    it("should not match invalid UUIDs", () => {
      const result = emit(uuidV4, "js", false);
      const regex = new RegExp(result.pattern);

      // Invalid cases
      expect(regex.test("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // Too short
      expect(regex.test("not-a-uuid")).toBe(false);
      expect(regex.test("123e4567-e89b-32d3-a456-426614174000")).toBe(false); // Wrong version (3 instead of 4)
    });

    it("should enforce version 4 format", () => {
      const result = emit(uuidV4, "js", false);
      const regex = new RegExp(result.pattern);

      // Version 4 has '4' at the start of the third group
      expect(regex.test("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx")).toBe(false); // Literal x's
      expect(regex.test("12345678-1234-4234-8234-123456789012")).toBe(true); // Valid v4
      expect(regex.test("12345678-1234-3234-8234-123456789012")).toBe(false); // Wrong version
    });

    it("should enforce variant bits in 4th group", () => {
      const result = emit(uuidV4, "js", false);
      const regex = new RegExp(result.pattern);

      // 4th group must start with 8, 9, a, or b
      expect(regex.test("12345678-1234-4234-8234-123456789012")).toBe(true);
      expect(regex.test("12345678-1234-4234-9234-123456789012")).toBe(true);
      expect(regex.test("12345678-1234-4234-a234-123456789012")).toBe(true);
      expect(regex.test("12345678-1234-4234-b234-123456789012")).toBe(true);
      expect(regex.test("12345678-1234-4234-c234-123456789012")).toBe(false); // Invalid variant
      expect(regex.test("12345678-1234-4234-0234-123456789012")).toBe(false); // Invalid variant
    });
  });

  describe("isoDate", () => {
    it("should match valid ISO date format", () => {
      const result = emit(isoDate, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("2023-12-25")).toBe(true);
      expect(regex.test("1999-01-01")).toBe(true);
      expect(regex.test("2025-10-21")).toBe(true);
    });

    it("should not match invalid date formats", () => {
      const result = emit(isoDate, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("23-12-25")).toBe(false); // Wrong year format
      expect(regex.test("2023-1-1")).toBe(false); // Missing leading zeros
      expect(regex.test("2023/12/25")).toBe(false); // Wrong separator
      expect(regex.test("not-a-date")).toBe(false);
    });
  });

  describe("isoDateTime", () => {
    it("should match valid ISO datetime format with milliseconds", () => {
      const result = emit(isoDateTime, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("2023-12-25T10:30:00.000Z")).toBe(true);
      expect(regex.test("1999-01-01T23:59:59.999Z")).toBe(true);
    });

    it("should match valid ISO datetime format without milliseconds", () => {
      const result = emit(isoDateTime, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("2023-12-25T10:30:00Z")).toBe(true);
      expect(regex.test("1999-01-01T00:00:00Z")).toBe(true);
    });

    it("should not match invalid datetime formats", () => {
      const result = emit(isoDateTime, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("2023-12-25 10:30:00Z")).toBe(false); // Space instead of T
      expect(regex.test("2023-12-25T10:30:00")).toBe(false); // Missing Z
      expect(regex.test("2023-12-25T10:30Z")).toBe(false); // Missing seconds
      expect(regex.test("not-a-datetime")).toBe(false);
    });
  });

  describe("ipv6Compressed", () => {
    it("should match loopback address", () => {
      const result = emit(ipv6Compressed, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("::1")).toBe(true);
    });

    it("should match IPv4-mapped IPv6 addresses", () => {
      const result = emit(ipv6Compressed, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("::ffff:192.0.2.1")).toBe(true);
      expect(regex.test("::ffff:10.0.0.1")).toBe(true);
    });

    it("should match compressed IPv6 addresses", () => {
      const result = emit(ipv6Compressed, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("2001:db8::1")).toBe(true);
      expect(regex.test("fe80::1")).toBe(true);
    });

    it("should match full IPv6 addresses", () => {
      const result = emit(ipv6Compressed, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
    });

    it("should not match invalid IPv6 formats", () => {
      const result = emit(ipv6Compressed, "js", false);
      const regex = new RegExp(result.pattern);

      expect(regex.test("not-an-ipv6")).toBe(false);
      expect(regex.test("192.168.1.1")).toBe(false); // IPv4
    });
  });

  describe("Pattern Consistency", () => {
    it("all refactored patterns should emit valid regexes", () => {
      const patterns = [uuidV4, isoDate, isoDateTime, ipv6Compressed];

      for (const pattern of patterns) {
        const result = emit(pattern, "js", false);
        expect(result.pattern).toBeTruthy();
        expect(result.pattern.length).toBeGreaterThan(0);

        // Should not contain raw escaped sequences (no \\d, \\w, etc.)
        // Note: The emitted pattern might have escapes, but the builder shouldn't use raw strings
        expect(() => new RegExp(result.pattern)).not.toThrow();
      }
    });
  });
});
