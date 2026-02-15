import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfigLayer, mergeConfigLayers } from "./config-parser.js";

describe("getConfigLayer", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "config-parser-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads a valid JSON file", () => {
    const filePath = join(dir, "settings.json");
    writeFileSync(filePath, JSON.stringify({ key: "value" }));

    const layer = getConfigLayer(filePath, "global");
    expect(layer.exists).toBe(true);
    expect(layer.content).toEqual({ key: "value" });
    expect(layer.source).toBe("global");
    expect(layer.filePath).toBe(filePath);
  });

  it("returns exists false for missing file", () => {
    const layer = getConfigLayer(join(dir, "nope.json"), "global");
    expect(layer.exists).toBe(false);
    expect(layer.content).toBeNull();
  });

  it("returns null content for invalid JSON", () => {
    const filePath = join(dir, "bad.json");
    writeFileSync(filePath, "not json{{{");

    const layer = getConfigLayer(filePath, "project");
    expect(layer.exists).toBe(true);
    expect(layer.content).toBeNull();
  });
});

describe("mergeConfigLayers", () => {
  let claudeHome: string;
  const originalEnv = process.env.CLAUDE_HOME;

  beforeEach(() => {
    claudeHome = mkdtempSync(join(tmpdir(), "claude-home-test-"));
    process.env.CLAUDE_HOME = claudeHome;
  });

  afterEach(() => {
    rmSync(claudeHome, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_HOME;
    } else {
      process.env.CLAUDE_HOME = originalEnv;
    }
  });

  it("returns empty merged config when no files exist", () => {
    const result = mergeConfigLayers();
    expect(result.merged).toEqual({});
    expect(result.layers).toHaveLength(2);
  });

  it("reads global settings", () => {
    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify({ theme: "dark" }));

    const result = mergeConfigLayers();
    expect(result.merged).toEqual({ theme: "dark" });
  });

  it("deep merges global and global-local", () => {
    writeFileSync(
      join(claudeHome, "settings.json"),
      JSON.stringify({ a: { x: 1, y: 2 }, b: "hello" }),
    );
    writeFileSync(
      join(claudeHome, "settings.local.json"),
      JSON.stringify({ a: { y: 99, z: 3 }, c: true }),
    );

    const result = mergeConfigLayers();
    expect(result.merged).toEqual({
      a: { x: 1, y: 99, z: 3 },
      b: "hello",
      c: true,
    });
  });

  it("includes project layers when projectPath is provided", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "project-test-"));
    const claudeDir = join(projectDir, ".claude");
    mkdirSync(claudeDir);

    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify({ global: true }));
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({ project: true }));

    const result = mergeConfigLayers(projectDir);
    expect(result.layers).toHaveLength(4);
    expect(result.merged).toEqual({ global: true, project: true });

    rmSync(projectDir, { recursive: true, force: true });
  });

  it("later layers override earlier ones", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "project-test-"));
    const claudeDir = join(projectDir, ".claude");
    mkdirSync(claudeDir);

    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify({ mode: "global" }));
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({ mode: "project" }));

    const result = mergeConfigLayers(projectDir);
    expect(result.merged.mode).toBe("project");

    rmSync(projectDir, { recursive: true, force: true });
  });

  it("arrays are replaced, not merged", () => {
    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify({ items: [1, 2] }));
    writeFileSync(join(claudeHome, "settings.local.json"), JSON.stringify({ items: [3] }));

    const result = mergeConfigLayers();
    expect(result.merged.items).toEqual([3]);
  });
});
