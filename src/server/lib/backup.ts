import { randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export type BackupOperation = "update" | "delete" | "move";

export interface BackupEntry {
  id: string;
  timestamp: Date;
  originalPath: string;
  operation: BackupOperation;
}

interface BackupMeta {
  originalPath: string;
  operation: BackupOperation;
  timestamp: string;
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function backupsDirPath(claudeHome: string): string {
  return join(claudeHome, "backups");
}

function isBackupMeta(v: unknown): v is BackupMeta {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).originalPath === "string" &&
    typeof (v as Record<string, unknown>).operation === "string" &&
    typeof (v as Record<string, unknown>).timestamp === "string"
  );
}

/**
 * Copy filePath into a new backup entry before it is mutated.
 * Returns the backup dir path, or "" if the file doesn't exist.
 * Never throws — backup failure must not block the write.
 */
export function backupFile(
  filePath: string,
  operation: BackupOperation,
  claudeHome: string,
): string {
  try {
    if (!existsSync(filePath)) return "";

    const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
    const dir = join(backupsDirPath(claudeHome), id);
    mkdirSync(dir, { recursive: true });

    const meta: BackupMeta = {
      originalPath: filePath,
      operation,
      timestamp: new Date().toISOString(),
    };
    writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2));
    copyFileSync(filePath, join(dir, "file"));

    // Prune fire-and-forget — deferred so it never adds to caller latency
    setImmediate(() => {
      try {
        pruneOldBackups(claudeHome);
      } catch {
        // non-fatal
      }
    });

    return dir;
  } catch {
    return "";
  }
}

/** List all backup entries, newest first. */
export function listBackups(claudeHome: string): BackupEntry[] {
  const dir = backupsDirPath(claudeHome);
  if (!existsSync(dir)) return [];

  const entries: BackupEntry[] = [];

  try {
    for (const id of readdirSync(dir)) {
      const metaPath = join(dir, id, "meta.json");
      if (!existsSync(metaPath)) continue;
      try {
        const parsed: unknown = JSON.parse(readFileSync(metaPath, "utf-8"));
        if (!isBackupMeta(parsed)) continue;
        const meta = parsed;
        entries.push({
          id,
          timestamp: new Date(meta.timestamp),
          originalPath: meta.originalPath,
          operation: meta.operation,
        });
      } catch {
        // skip malformed entries
      }
    }
  } catch {
    return [];
  }

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/** Delete backup dirs older than 30 days. */
export function pruneOldBackups(claudeHome: string): void {
  const dir = backupsDirPath(claudeHome);
  if (!existsSync(dir)) return;

  const cutoff = Date.now() - RETENTION_MS;

  try {
    for (const id of readdirSync(dir)) {
      const entryDir = join(dir, id);
      const metaPath = join(entryDir, "meta.json");
      if (!existsSync(metaPath)) {
        // Corrupted entry (no meta.json) — always remove
        try {
          rmSync(entryDir, { recursive: true });
        } catch {
          /* ignore */
        }
        continue;
      }
      try {
        const parsed: unknown = JSON.parse(readFileSync(metaPath, "utf-8"));
        if (!isBackupMeta(parsed)) continue;
        const meta = parsed;
        if (new Date(meta.timestamp).getTime() < cutoff) {
          rmSync(entryDir, { recursive: true });
        }
      } catch {
        // skip unreadable
      }
    }
  } catch {
    // non-fatal
  }
}

/**
 * Restore a backup entry to its original path.
 * Backs up the current file first (so restore is itself undoable).
 */
export function restoreBackup(backupDir: string, claudeHome: string): void {
  const metaPath = join(backupDir, "meta.json");
  if (!existsSync(metaPath)) {
    throw new Error(`Backup is corrupted — missing meta.json: ${backupDir}`);
  }
  const parsed: unknown = JSON.parse(readFileSync(metaPath, "utf-8"));
  if (!isBackupMeta(parsed)) {
    throw new Error(`Backup is corrupted — invalid meta.json: ${backupDir}`);
  }
  const meta = parsed;

  // Back up current state first
  backupFile(meta.originalPath, "update", claudeHome);

  const parentDir = dirname(meta.originalPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const backupFilePath = join(backupDir, "file");
  if (!existsSync(backupFilePath)) {
    throw new Error(`Backup is corrupted — missing file: ${backupDir}`);
  }
  copyFileSync(backupFilePath, meta.originalPath);
}
