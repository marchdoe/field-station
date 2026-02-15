import { describe, expect, it } from "vitest";
import { redactSensitiveValues } from "./redact.js";

describe("redactSensitiveValues", () => {
  describe("sensitive keys", () => {
    it("redacts values under keys matching sensitive patterns", () => {
      const result = redactSensitiveValues({
        apiKey: "my-value",
        secretToken: "another",
        password: "hunter2",
        authHeader: "abc123",
      });
      expect(result).toEqual({
        apiKey: "[REDACTED]",
        secretToken: "[REDACTED]",
        password: "[REDACTED]",
        authHeader: "[REDACTED]",
      });
    });

    it("is case-insensitive for key matching", () => {
      expect(redactSensitiveValues({ API_KEY: "val" })).toEqual({ API_KEY: "[REDACTED]" });
      expect(redactSensitiveValues({ Password: "val" })).toEqual({ Password: "[REDACTED]" });
    });

    it("does not redact non-sensitive keys", () => {
      const data = { name: "test", count: 42, enabled: true };
      expect(redactSensitiveValues(data)).toEqual(data);
    });
  });

  describe("sensitive value patterns", () => {
    it("redacts Anthropic API keys", () => {
      expect(redactSensitiveValues("sk-ant-abc123456789012345678")).toBe("[REDACTED]");
    });

    it("redacts OpenAI-style keys", () => {
      expect(redactSensitiveValues("sk-abcdefghij1234567890abcd")).toBe("[REDACTED]");
    });

    it("redacts GitHub PATs", () => {
      expect(redactSensitiveValues("ghp_abcdefghijklmnopqrstuvwxyz1234567890")).toBe("[REDACTED]");
    });

    it("redacts JWTs", () => {
      expect(redactSensitiveValues("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.xxx")).toBe(
        "[REDACTED]",
      );
    });

    it("redacts Bearer tokens", () => {
      expect(redactSensitiveValues("Bearer some-token-value")).toBe("[REDACTED]");
    });

    it("redacts AWS access keys", () => {
      expect(redactSensitiveValues("AKIAIOSFODNN7EXAMPLE")).toBe("[REDACTED]");
    });

    it("does not redact normal strings", () => {
      expect(redactSensitiveValues("hello world")).toBe("hello world");
    });
  });

  describe("env object special handling", () => {
    it("redacts all values under env key", () => {
      const result = redactSensitiveValues({
        env: { PATH: "/usr/bin", HOME: "/home/user" },
      });
      expect(result).toEqual({
        env: { PATH: "[REDACTED]", HOME: "[REDACTED]" },
      });
    });
  });

  describe("nested objects and arrays", () => {
    it("recursively redacts nested objects", () => {
      const result = redactSensitiveValues({
        config: { apiKey: "secret-val" },
      });
      expect(result).toEqual({
        config: { apiKey: "[REDACTED]" },
      });
    });

    it("redacts sensitive values in arrays", () => {
      const result = redactSensitiveValues(["normal", "sk-ant-abc123456789012345678"]);
      expect(result).toEqual(["normal", "[REDACTED]"]);
    });
  });

  describe("passthrough", () => {
    it("returns null as-is", () => {
      expect(redactSensitiveValues(null)).toBeNull();
    });

    it("returns undefined as-is", () => {
      expect(redactSensitiveValues(undefined)).toBeUndefined();
    });

    it("returns numbers as-is", () => {
      expect(redactSensitiveValues(42)).toBe(42);
    });

    it("returns booleans as-is", () => {
      expect(redactSensitiveValues(true)).toBe(true);
    });
  });
});
