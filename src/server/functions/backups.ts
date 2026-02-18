import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { listBackups, restoreBackup } from "../lib/backup.js";

export const getBackups = createServerFn({ method: "GET" }).handler(async () => {
  const claudeHome = resolveClaudeHome();
  const entries = listBackups(claudeHome);
  return entries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp.toISOString(),
    originalPath: e.originalPath,
    operation: e.operation,
  }));
});

const restoreBackupInput = z.object({
  backupId: z.string().min(1),
});

export const restoreBackupFn = createServerFn({ method: "POST" })
  .inputValidator(restoreBackupInput)
  .handler(async ({ data }) => {
    const claudeHome = resolveClaudeHome();
    const backupDir = `${claudeHome}/backups/${data.backupId}`;
    restoreBackup(backupDir, claudeHome);
    return { success: true };
  });
