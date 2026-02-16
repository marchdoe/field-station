import { describe, expect, it, vi } from "vitest";

vi.mock("./claude-home.js", () => ({
  resolveClaudeHome: () => "/Users/me/.claude",
}));

import { isUserOwned } from "./ownership.js";

describe("isUserOwned", () => {
  it("returns true for global agents directory", () => {
    expect(isUserOwned("/Users/me/.claude/agents/my-agent.md")).toBe(true);
  });

  it("returns true for global settings.json", () => {
    expect(isUserOwned("/Users/me/.claude/settings.json")).toBe(true);
  });

  it("returns true for project .claude directory", () => {
    expect(isUserOwned("/Users/me/project/.claude/settings.json")).toBe(true);
  });

  it("returns false for plugin cache paths", () => {
    expect(
      isUserOwned("/Users/me/.claude/plugins/cache/some-plugin/agents/foo.md"),
    ).toBe(false);
  });

  it("returns false for nested plugin cache paths", () => {
    expect(
      isUserOwned(
        "/Users/me/.claude/plugins/cache/org/plugin/skills/bar/SKILL.md",
      ),
    ).toBe(false);
  });

  it("returns true for plugins directory outside cache", () => {
    expect(
      isUserOwned("/Users/me/.claude/plugins/installed_plugins.json"),
    ).toBe(true);
  });

  it("returns false for traversal attempt targeting plugin cache", () => {
    expect(
      isUserOwned(
        "/tmp/../Users/me/.claude/plugins/cache/some-plugin/agent.md",
      ),
    ).toBe(false);
  });

  it("returns true for path containing 'plugins/cache' substring outside claude home", () => {
    expect(isUserOwned("/tmp/plugins/cache/not-a-real-plugin/file.md")).toBe(
      true,
    );
  });

  it("returns false for plugin cache path with .. in middle", () => {
    expect(
      isUserOwned("/Users/me/.claude/plugins/cache/foo/../bar/agent.md"),
    ).toBe(false);
  });
});
