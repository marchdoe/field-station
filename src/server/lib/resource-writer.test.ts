import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createResourceFile,
  deleteResourceFile,
  resolveResourcePath,
  serializeMarkdown,
  updateResourceFile,
} from "./resource-writer.js";

describe("serializeMarkdown", () => {
  it("serializes frontmatter + body", () => {
    const result = serializeMarkdown({ name: "Test", description: "A test" }, "Hello world");
    expect(result).toContain("---");
    expect(result).toContain("name: Test");
    expect(result).toContain("description: A test");
    expect(result).toContain("Hello world");
  });

  it("returns body only when frontmatter is empty", () => {
    const result = serializeMarkdown({}, "Just body");
    expect(result).toBe("Just body");
    expect(result).not.toContain("---");
  });
});

describe("resolveResourcePath", () => {
  it("resolves agent path", () => {
    const result = resolveResourcePath("/base", "agent", "my-agent");
    expect(result).toBe("/base/agents/my-agent.md");
  });

  it("resolves command path with folder", () => {
    const result = resolveResourcePath("/base", "command", "run", "dev");
    expect(result).toBe("/base/commands/dev/run.md");
  });

  it("resolves skill path", () => {
    const result = resolveResourcePath("/base", "skill", "my-skill");
    expect(result).toBe("/base/skills/my-skill/SKILL.md");
  });
});

describe("createResourceFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fs-res-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("creates an agent markdown file with frontmatter", () => {
    const filePath = join(tmpDir, "agents", "test.md");
    createResourceFile(filePath, { name: "Test Agent", description: "Does things" }, "Agent body");
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("name: Test Agent");
    expect(content).toContain("Agent body");
  });

  it("creates a command file without frontmatter", () => {
    const filePath = join(tmpDir, "commands", "dev", "start.md");
    createResourceFile(filePath, {}, "Run the dev server");
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("Run the dev server");
  });

  it("creates parent directories if needed", () => {
    const filePath = join(tmpDir, "deep", "nested", "file.md");
    createResourceFile(filePath, {}, "content");
    expect(existsSync(filePath)).toBe(true);
  });

  it("throws if file already exists", () => {
    const filePath = join(tmpDir, "existing.md");
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(filePath, "existing");
    expect(() => createResourceFile(filePath, {}, "new")).toThrow("already exists");
  });

  it("throws if path is not user-owned", () => {
    const filePath = join(tmpDir, "plugins", "cache", "test.md");
    expect(() => createResourceFile(filePath, {}, "content")).toThrow("not user-owned");
  });
});

describe("updateResourceFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fs-res-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("overwrites an existing file", () => {
    const filePath = join(tmpDir, "agent.md");
    writeFileSync(filePath, "old content");
    updateResourceFile(filePath, { name: "Updated" }, "New body");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("name: Updated");
    expect(content).toContain("New body");
  });

  it("writes body-only when frontmatter is empty", () => {
    const filePath = join(tmpDir, "command.md");
    writeFileSync(filePath, "old");
    updateResourceFile(filePath, {}, "Updated command");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("Updated command");
  });

  it("throws if file does not exist", () => {
    const filePath = join(tmpDir, "missing.md");
    expect(() => updateResourceFile(filePath, {}, "content")).toThrow("does not exist");
  });

  it("throws if path is not user-owned", () => {
    const filePath = join(tmpDir, "plugins", "cache", "agent.md");
    mkdirSync(join(tmpDir, "plugins", "cache"), { recursive: true });
    writeFileSync(filePath, "content");
    expect(() => updateResourceFile(filePath, {}, "new")).toThrow("not user-owned");
  });
});

describe("deleteResourceFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fs-res-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("deletes an existing file", () => {
    const filePath = join(tmpDir, "agent.md");
    writeFileSync(filePath, "content");
    deleteResourceFile(filePath);
    expect(existsSync(filePath)).toBe(false);
  });

  it("throws if file does not exist", () => {
    const filePath = join(tmpDir, "missing.md");
    expect(() => deleteResourceFile(filePath)).toThrow("does not exist");
  });

  it("throws if path is not user-owned", () => {
    const filePath = join(tmpDir, "plugins", "cache", "agent.md");
    mkdirSync(join(tmpDir, "plugins", "cache"), { recursive: true });
    writeFileSync(filePath, "content");
    expect(() => deleteResourceFile(filePath)).toThrow("not user-owned");
  });
});
