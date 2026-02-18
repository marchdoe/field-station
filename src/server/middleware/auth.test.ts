import { describe, expect, it } from "vitest";
import { createSession } from "../lib/auth-session.js";
import { shouldAllow } from "./auth.js";

describe("shouldAllow", () => {
  const token = "test-token";

  it("always allows when no token configured", () => {
    expect(shouldAllow(undefined, undefined, "/")).toBe(true);
    expect(shouldAllow(undefined, "garbage", "/")).toBe(true);
  });

  it("always allows /login path", () => {
    expect(shouldAllow(token, undefined, "/login")).toBe(true);
    expect(shouldAllow(token, undefined, "/login?next=/")).toBe(true);
  });

  it("always allows /api/auth/ paths", () => {
    expect(shouldAllow(token, undefined, "/api/auth/login")).toBe(true);
    expect(shouldAllow(token, undefined, "/api/auth/logout")).toBe(true);
  });

  it("blocks with no cookie when token configured", () => {
    expect(shouldAllow(token, undefined, "/")).toBe(false);
  });

  it("allows with valid signed cookie", () => {
    const session = createSession(token);
    expect(shouldAllow(token, session, "/")).toBe(true);
  });

  it("blocks with invalid cookie", () => {
    expect(shouldAllow(token, "invalid.cookie", "/")).toBe(false);
  });

  it("blocks with cookie signed by wrong token", () => {
    const session = createSession("different-token");
    expect(shouldAllow(token, session, "/")).toBe(false);
  });
});
