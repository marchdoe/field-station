import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readPersistedVersion, writePersistedVersion } from "./version-persistence.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "version-persistence-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("readPersistedVersion", () => {
  it("returns null when file does not exist", () => {
    expect(readPersistedVersion(tmpDir)).toBeNull();
  });

  it("returns the version string when file exists", () => {
    writePersistedVersion(tmpDir, "1.2.3");
    expect(readPersistedVersion(tmpDir)).toBe("1.2.3");
  });

  it("returns null when file contains malformed JSON", () => {
    writeFileSync(join(tmpDir, "claude-version.json"), "not json");
    expect(readPersistedVersion(tmpDir)).toBeNull();
  });

  it("returns null when version field is missing", () => {
    writeFileSync(join(tmpDir, "claude-version.json"), JSON.stringify({ other: "field" }));
    expect(readPersistedVersion(tmpDir)).toBeNull();
  });

  it("handles null version stored in file", () => {
    writePersistedVersion(tmpDir, null);
    expect(readPersistedVersion(tmpDir)).toBeNull();
  });
});

describe("writePersistedVersion", () => {
  it("creates the file and stores the version", () => {
    writePersistedVersion(tmpDir, "2.0.0");
    expect(readPersistedVersion(tmpDir)).toBe("2.0.0");
  });

  it("overwrites existing version", () => {
    writePersistedVersion(tmpDir, "1.0.0");
    writePersistedVersion(tmpDir, "2.0.0");
    expect(readPersistedVersion(tmpDir)).toBe("2.0.0");
  });
});
