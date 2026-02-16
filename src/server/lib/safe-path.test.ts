import { describe, expect, it } from "vitest";
import { assertSafePath } from "./safe-path.js";

describe("assertSafePath", () => {
  const allowedRoots = ["/Users/me/.claude", "/Users/me/projects/myapp"];

  it("returns resolved path for valid path within allowed root", () => {
    expect(assertSafePath("/Users/me/.claude/settings.json", allowedRoots)).toBe(
      "/Users/me/.claude/settings.json",
    );
  });

  it("returns resolved path for valid path within project root", () => {
    expect(assertSafePath("/Users/me/projects/myapp/.claude/settings.json", allowedRoots)).toBe(
      "/Users/me/projects/myapp/.claude/settings.json",
    );
  });

  it("normalizes .. sequences and validates containment", () => {
    expect(
      assertSafePath("/Users/me/.claude/agents/../settings.json", allowedRoots),
    ).toBe("/Users/me/.claude/settings.json");
  });

  it("rejects paths that traverse outside allowed roots", () => {
    expect(() =>
      assertSafePath("/Users/me/.claude/../../etc/passwd", allowedRoots),
    ).toThrow();
  });

  it("rejects paths completely outside allowed roots", () => {
    expect(() => assertSafePath("/tmp/evil", allowedRoots)).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => assertSafePath("", allowedRoots)).toThrow();
  });

  it("normalizes double slashes", () => {
    expect(assertSafePath("/Users/me/.claude//settings.json", allowedRoots)).toBe(
      "/Users/me/.claude/settings.json",
    );
  });

  it("normalizes . in path", () => {
    expect(assertSafePath("/Users/me/.claude/./settings.json", allowedRoots)).toBe(
      "/Users/me/.claude/settings.json",
    );
  });

  it("rejects when allowed roots list is empty", () => {
    expect(() => assertSafePath("/Users/me/.claude/settings.json", [])).toThrow();
  });

  it("resolves allowed roots before comparing", () => {
    const roots = ["/Users/me/projects/../.claude"];
    expect(assertSafePath("/Users/me/.claude/settings.json", roots)).toBe(
      "/Users/me/.claude/settings.json",
    );
  });
});
