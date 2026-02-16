import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafePath, getAllowedRoots } from "./safe-path.js";

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

describe("getAllowedRoots", () => {
  const testDir = join(tmpdir(), "safe-path-test");
  const fakeClaudeHome = join(testDir, ".claude");
  const fakeProjectsFile = join(testDir, "data", "projects.json");

  beforeEach(() => {
    mkdirSync(join(fakeClaudeHome, "projects"), { recursive: true });
    mkdirSync(join(testDir, "data"), { recursive: true });
    vi.stubEnv("CLAUDE_HOME", fakeClaudeHome);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("always includes claude home", () => {
    const roots = getAllowedRoots(fakeProjectsFile);
    expect(roots).toContain(fakeClaudeHome);
  });

  it("includes registered project paths", () => {
    const projectPath = join(testDir, "my-project");
    writeFileSync(fakeProjectsFile, JSON.stringify([projectPath]));
    const roots = getAllowedRoots(fakeProjectsFile);
    expect(roots).toContain(projectPath);
  });

  it("includes scanned project directories", () => {
    const encodedDir = "-Users-me-some-project";
    mkdirSync(join(fakeClaudeHome, "projects", encodedDir));
    const roots = getAllowedRoots(fakeProjectsFile);
    expect(roots).toContain("/Users/me/some/project");
  });

  it("handles missing projects.json gracefully", () => {
    const roots = getAllowedRoots(join(testDir, "nonexistent", "projects.json"));
    expect(roots).toContain(fakeClaudeHome);
  });

  it("handles malformed projects.json gracefully", () => {
    writeFileSync(fakeProjectsFile, "not valid json {{{{");
    const roots = getAllowedRoots(fakeProjectsFile);
    expect(roots).toContain(fakeClaudeHome);
  });

  it("skips non-string entries in projects.json", () => {
    const projectPath = join(testDir, "valid-project");
    writeFileSync(fakeProjectsFile, JSON.stringify([projectPath, 123, null, ""]));
    const roots = getAllowedRoots(fakeProjectsFile);
    expect(roots).toContain(projectPath);
    expect(roots).toHaveLength(2); // claude home + valid project
  });
});
