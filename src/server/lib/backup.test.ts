import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { backupFile, listBackups, pruneOldBackups, restoreBackup } from "./backup.js";

describe("backupFile", () => {
  let claudeHome: string;
  let sourceDir: string;

  beforeEach(() => {
    claudeHome = mkdtempSync(join(tmpdir(), "fs-backup-test-claude-"));
    sourceDir = mkdtempSync(join(tmpdir(), "fs-backup-test-source-"));
  });

  afterEach(() => {
    rmSync(claudeHome, { recursive: true });
    rmSync(sourceDir, { recursive: true });
  });

  it("creates a backup dir with meta.json and file", () => {
    const filePath = join(sourceDir, "settings.json");
    writeFileSync(filePath, '{"key":"value"}');

    const backupDir = backupFile(filePath, "update", claudeHome);

    const backupsDir = join(claudeHome, "backups");
    expect(existsSync(backupDir)).toBe(true);
    expect(existsSync(join(backupDir, "file"))).toBe(true);
    expect(existsSync(join(backupDir, "meta.json"))).toBe(true);

    const meta = JSON.parse(readFileSync(join(backupDir, "meta.json"), "utf-8")) as {
      originalPath: string;
      operation: string;
      timestamp: string;
    };
    expect(meta.originalPath).toBe(filePath);
    expect(meta.operation).toBe("update");
    expect(new Date(meta.timestamp).getTime()).toBeGreaterThan(0);
    expect(backupDir.startsWith(backupsDir)).toBe(true);
  });

  it("copies file content verbatim", () => {
    const filePath = join(sourceDir, "agent.md");
    writeFileSync(filePath, "# My Agent\nsome content");

    const backupDir = backupFile(filePath, "delete", claudeHome);

    expect(readFileSync(join(backupDir, "file"), "utf-8")).toBe("# My Agent\nsome content");
  });

  it("returns empty string and does not throw if source file does not exist", () => {
    const filePath = join(sourceDir, "nonexistent.json");
    expect(() => backupFile(filePath, "update", claudeHome)).not.toThrow();
    const result = backupFile(filePath, "update", claudeHome);
    expect(result).toBe("");
  });

  it("produces unique backup dirs on repeated calls", () => {
    const filePath = join(sourceDir, "settings.json");
    writeFileSync(filePath, "{}");

    const a = backupFile(filePath, "update", claudeHome);
    const b = backupFile(filePath, "update", claudeHome);
    expect(a).not.toBe(b);
  });
});

describe("listBackups", () => {
  let claudeHome: string;

  beforeEach(() => {
    claudeHome = mkdtempSync(join(tmpdir(), "fs-backup-list-test-"));
  });

  afterEach(() => {
    rmSync(claudeHome, { recursive: true });
  });

  it("returns empty array when no backups dir exists", () => {
    expect(listBackups(claudeHome)).toEqual([]);
  });

  it("returns entries sorted newest-first", () => {
    const backupsDir = join(claudeHome, "backups");
    mkdirSync(backupsDir, { recursive: true });

    const olderTs = "2026-01-01T00:00:00.000Z";
    const newerTs = "2026-02-01T00:00:00.000Z";
    const older = `${olderTs.replace(/[:.]/g, "-")}-aaaaaa`;
    const newer = `${newerTs.replace(/[:.]/g, "-")}-bbbbbb`;

    for (const [id, ts] of [
      [older, olderTs],
      [newer, newerTs],
    ] as [string, string][]) {
      const dir = join(backupsDir, id);
      mkdirSync(dir);
      writeFileSync(
        join(dir, "meta.json"),
        JSON.stringify({ originalPath: "/some/file.json", operation: "update", timestamp: ts }),
      );
      writeFileSync(join(dir, "file"), "{}");
    }

    const entries = listBackups(claudeHome);
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe(newer);
    expect(entries[1].id).toBe(older);
  });

  it("skips dirs with missing meta.json", () => {
    const backupsDir = join(claudeHome, "backups");
    mkdirSync(backupsDir, { recursive: true });
    const bad = join(backupsDir, "2026-01-01T00-00-00-000Z-bad000");
    mkdirSync(bad);
    expect(listBackups(claudeHome)).toHaveLength(0);
  });
});

describe("pruneOldBackups", () => {
  let claudeHome: string;

  beforeEach(() => {
    claudeHome = mkdtempSync(join(tmpdir(), "fs-backup-prune-test-"));
  });

  afterEach(() => {
    rmSync(claudeHome, { recursive: true });
  });

  it("deletes backup dirs older than 30 days", () => {
    const backupsDir = join(claudeHome, "backups");
    mkdirSync(backupsDir, { recursive: true });

    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const oldId = `${oldDate.toISOString().replace(/[:.]/g, "-")}-old000`;
    const oldDir = join(backupsDir, oldId);
    mkdirSync(oldDir);
    writeFileSync(
      join(oldDir, "meta.json"),
      JSON.stringify({
        originalPath: "/f.json",
        operation: "update",
        timestamp: oldDate.toISOString(),
      }),
    );
    writeFileSync(join(oldDir, "file"), "{}");

    const newDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const newId = `${newDate.toISOString().replace(/[:.]/g, "-")}-new000`;
    const newDir = join(backupsDir, newId);
    mkdirSync(newDir);
    writeFileSync(
      join(newDir, "meta.json"),
      JSON.stringify({
        originalPath: "/f.json",
        operation: "update",
        timestamp: newDate.toISOString(),
      }),
    );
    writeFileSync(join(newDir, "file"), "{}");

    pruneOldBackups(claudeHome);

    expect(existsSync(oldDir)).toBe(false);
    expect(existsSync(newDir)).toBe(true);
  });

  it("does not throw if backups dir does not exist", () => {
    expect(() => pruneOldBackups(claudeHome)).not.toThrow();
  });
});

describe("restoreBackup", () => {
  let claudeHome: string;
  let targetDir: string;

  beforeEach(() => {
    claudeHome = mkdtempSync(join(tmpdir(), "fs-backup-restore-test-claude-"));
    targetDir = mkdtempSync(join(tmpdir(), "fs-backup-restore-test-target-"));
  });

  afterEach(() => {
    rmSync(claudeHome, { recursive: true });
    rmSync(targetDir, { recursive: true });
  });

  it("copies backed-up file back to original path", () => {
    const originalPath = join(targetDir, "settings.json");
    writeFileSync(originalPath, '{"before":"mutation"}');

    const backupsDir = join(claudeHome, "backups");
    mkdirSync(backupsDir, { recursive: true });
    const backupDir = join(backupsDir, "2026-02-18T12-00-00-000Z-abc123");
    mkdirSync(backupDir);
    writeFileSync(
      join(backupDir, "meta.json"),
      JSON.stringify({ originalPath, operation: "update", timestamp: new Date().toISOString() }),
    );
    writeFileSync(join(backupDir, "file"), '{"original":"content"}');

    restoreBackup(backupDir, claudeHome);

    expect(readFileSync(originalPath, "utf-8")).toBe('{"original":"content"}');
  });

  it("creates parent dirs if original path no longer exists (restoring a deleted file)", () => {
    const originalPath = join(targetDir, "subdir", "agent.md");

    const backupsDir = join(claudeHome, "backups");
    mkdirSync(backupsDir, { recursive: true });
    const backupDir = join(backupsDir, "2026-02-18T12-00-00-000Z-def456");
    mkdirSync(backupDir);
    writeFileSync(
      join(backupDir, "meta.json"),
      JSON.stringify({ originalPath, operation: "delete", timestamp: new Date().toISOString() }),
    );
    writeFileSync(join(backupDir, "file"), "# Restored Agent");

    restoreBackup(backupDir, claudeHome);

    expect(readFileSync(originalPath, "utf-8")).toBe("# Restored Agent");
  });

  it("creates a pre-restore backup before overwriting", () => {
    const originalPath = join(targetDir, "settings.json");
    writeFileSync(originalPath, '{"current":"state"}');

    const backupsDir = join(claudeHome, "backups");
    mkdirSync(backupsDir, { recursive: true });
    const backupDir = join(backupsDir, "2026-02-18T12-00-00-000Z-ghi789");
    mkdirSync(backupDir);
    writeFileSync(
      join(backupDir, "meta.json"),
      JSON.stringify({ originalPath, operation: "update", timestamp: new Date().toISOString() }),
    );
    writeFileSync(join(backupDir, "file"), '{"restored":"content"}');

    restoreBackup(backupDir, claudeHome);

    const allBackups = listBackups(claudeHome);
    // Should have at least 2 entries: the original backup + the pre-restore backup
    expect(allBackups.length).toBeGreaterThanOrEqual(2);
  });
});
