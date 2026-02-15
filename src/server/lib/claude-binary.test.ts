import { describe, expect, it, vi } from "vitest";
import {
  getClaudeVersion,
  locateClaudeBinary,
  scanBinaryForEnvVars,
  scanClaudeBinary,
} from "./claude-binary.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd === "claude --version 2>/dev/null") return Buffer.from("2.1.42 (Claude Code)\n");
    if (cmd.startsWith("which claude")) return Buffer.from("/usr/local/bin/claude\n");
    if (cmd.includes("realpath") || cmd.includes("readlink"))
      return Buffer.from("/usr/local/share/claude/versions/2.1.42\n");
    if (cmd.startsWith("strings ")) {
      return Buffer.from(
        `${[
          "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
          "CLAUDE_CODE_DISABLE_AUTO_MEMORY",
          "DISABLE_TELEMETRY",
          "CLAUDE_CODE_EXTRA_BODY env var must be valid", // noise — contains lowercase
          "some random string", // noise
          "CLAUDE_CODE_EFFORT_LEVEL",
        ].join("\n")}\n`,
      );
    }
    return Buffer.from("");
  }),
}));

describe("getClaudeVersion", () => {
  it("returns version string", () => {
    expect(getClaudeVersion()).toBe("2.1.42");
  });
});

describe("locateClaudeBinary", () => {
  it("resolves binary path via which + readlink", () => {
    const path = locateClaudeBinary();
    expect(path).toBe("/usr/local/share/claude/versions/2.1.42");
  });
});

describe("scanBinaryForEnvVars", () => {
  it("extracts valid env var names and filters noise", () => {
    const vars = scanBinaryForEnvVars("/fake/binary");
    expect(vars).toContain("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS");
    expect(vars).toContain("CLAUDE_CODE_DISABLE_AUTO_MEMORY");
    expect(vars).toContain("DISABLE_TELEMETRY");
    expect(vars).toContain("CLAUDE_CODE_EFFORT_LEVEL");
    // Noise filtered out
    expect(vars).not.toContain("CLAUDE_CODE_EXTRA_BODY env var must be valid");
    expect(vars).not.toContain("some random string");
  });
});

describe("scanClaudeBinary", () => {
  it("returns full scan result", () => {
    const result = scanClaudeBinary();
    expect(result.version).toBe("2.1.42");
    expect(result.binaryPath).toBe("/usr/local/share/claude/versions/2.1.42");
    expect(result.envVars).toContain("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS");
  });
});
