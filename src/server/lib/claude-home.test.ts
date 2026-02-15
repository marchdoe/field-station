import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveClaudeHome } from "./claude-home.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn((p: string) => p === "/custom/claude"),
}));

describe("resolveClaudeHome", () => {
  const original = process.env.CLAUDE_HOME;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CLAUDE_HOME;
    } else {
      process.env.CLAUDE_HOME = original;
    }
  });

  it("returns CLAUDE_HOME when set and directory exists", () => {
    process.env.CLAUDE_HOME = "/custom/claude";
    expect(resolveClaudeHome()).toBe("/custom/claude");
  });

  it("falls back to ~/.claude when CLAUDE_HOME is unset", () => {
    delete process.env.CLAUDE_HOME;
    expect(resolveClaudeHome()).toBe(join(homedir(), ".claude"));
  });

  it("falls back to ~/.claude when CLAUDE_HOME points to non-existent dir", () => {
    process.env.CLAUDE_HOME = "/does/not/exist";
    expect(resolveClaudeHome()).toBe(join(homedir(), ".claude"));
  });
});
