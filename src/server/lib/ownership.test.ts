import { describe, expect, it } from "vitest";
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
    expect(isUserOwned("/Users/me/.claude/plugins/cache/some-plugin/agents/foo.md")).toBe(false);
  });

  it("returns false for nested plugin cache paths", () => {
    expect(isUserOwned("/Users/me/.claude/plugins/cache/org/plugin/skills/bar/SKILL.md")).toBe(
      false,
    );
  });

  it("returns true for plugins directory outside cache", () => {
    expect(isUserOwned("/Users/me/.claude/plugins/installed_plugins.json")).toBe(true);
  });
});
