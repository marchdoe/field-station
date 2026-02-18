import { describe, expect, it } from "vitest";
import { createSession, verifySession } from "./auth-session.js";

describe("createSession", () => {
  it("returns a string in the format {id}.{hmac}", () => {
    const result = createSession("my-token");
    const parts = result.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/); // 16 bytes hex
    expect(parts[1]).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 32 bytes hex
  });

  it("produces different session IDs each call", () => {
    const a = createSession("token");
    const b = createSession("token");
    expect(a).not.toBe(b);
  });
});

describe("verifySession", () => {
  it("returns true for a valid session created with the same token", () => {
    const session = createSession("secret");
    expect(verifySession(session, "secret")).toBe(true);
  });

  it("returns false when token is different", () => {
    const session = createSession("secret");
    expect(verifySession(session, "wrong")).toBe(false);
  });

  it("returns false for a tampered session ID", () => {
    const session = createSession("secret");
    const [, hmac] = session.split(".");
    expect(verifySession(`tampered.${hmac}`, "secret")).toBe(false);
  });

  it("returns false for malformed input (no dot)", () => {
    expect(verifySession("nodot", "secret")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(verifySession("", "secret")).toBe(false);
  });
});
