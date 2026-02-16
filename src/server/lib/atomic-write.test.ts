import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileAtomic } from "./atomic-write.js";

describe("writeFileAtomic", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fs-atomic-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("writes content and file is readable afterward", () => {
    const filePath = join(tmpDir, "test.json");
    writeFileAtomic(filePath, '{"key":"value"}\n');
    expect(readFileSync(filePath, "utf-8")).toBe('{"key":"value"}\n');
  });

  it("overwrites existing file atomically", () => {
    const filePath = join(tmpDir, "test.json");
    writeFileSync(filePath, "old content");
    writeFileAtomic(filePath, "new content");
    expect(readFileSync(filePath, "utf-8")).toBe("new content");
  });

  it("leaves no temp files after successful write", () => {
    const filePath = join(tmpDir, "test.json");
    writeFileAtomic(filePath, "content");
    const files = readdirSync(tmpDir);
    expect(files).toEqual(["test.json"]);
  });

  it("throws if directory does not exist", () => {
    const filePath = join(tmpDir, "nonexistent", "test.json");
    expect(() => writeFileAtomic(filePath, "content")).toThrow();
    // No temp files should leak in tmpDir either
    const files = readdirSync(tmpDir);
    expect(files.filter((f) => f.startsWith(".tmp-"))).toEqual([]);
  });

  it("preserves file when write to same path is called multiple times", () => {
    const filePath = join(tmpDir, "test.json");
    writeFileAtomic(filePath, "first");
    writeFileAtomic(filePath, "second");
    writeFileAtomic(filePath, "third");
    expect(readFileSync(filePath, "utf-8")).toBe("third");
    const files = readdirSync(tmpDir);
    expect(files).toEqual(["test.json"]);
  });

  it("does not corrupt target file if rename source is missing", () => {
    const filePath = join(tmpDir, "test.json");
    writeFileSync(filePath, "original");
    // Write to a nonexistent dir to trigger error — original file should be untouched
    const badPath = join(tmpDir, "no-dir", "test.json");
    expect(() => writeFileAtomic(badPath, "bad")).toThrow();
    expect(readFileSync(filePath, "utf-8")).toBe("original");
  });
});
