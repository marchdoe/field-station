import { describe, expect, it } from "vitest";
import { isSafePath } from "./safe-redirect.js";

describe("isSafePath", () => {
  it("allows absolute paths", () => {
    expect(isSafePath("/")).toBe(true);
    expect(isSafePath("/projects")).toBe(true);
    expect(isSafePath("/projects/foo/bar")).toBe(true);
  });

  it("allows paths with query strings", () => {
    expect(isSafePath("/projects?foo=bar")).toBe(true);
  });

  it("blocks protocol-relative URLs", () => {
    expect(isSafePath("//evil.com")).toBe(false);
    expect(isSafePath("//evil.com/path")).toBe(false);
  });

  it("blocks full URLs", () => {
    expect(isSafePath("http://evil.com")).toBe(false);
    expect(isSafePath("https://evil.com")).toBe(false);
    expect(isSafePath("https://evil.com/path")).toBe(false);
  });

  it("blocks javascript: scheme", () => {
    expect(isSafePath("javascript:alert(1)")).toBe(false);
  });

  it("blocks backslash-prefixed values", () => {
    expect(isSafePath("\\evil.com")).toBe(false);
    expect(isSafePath("\\\\evil.com")).toBe(false);
  });

  it("allows empty string (resolves to current origin root)", () => {
    // new URL("", "http://x") resolves to "http://x/" — origin matches, so true
    expect(isSafePath("")).toBe(true);
  });
});
