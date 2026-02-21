import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import type { BackupFile } from "@/lib/api.js";
import * as api from "@/lib/api.js";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function displayPath(originalPath: string): string {
  const home = originalPath.match(/^\/(?:home|Users)\/[^/]+\//)?.[0];
  if (home) return originalPath.replace(home, "~/");
  return originalPath;
}

function groupByDay(entries: BackupFile[]): [string, BackupFile[]][] {
  const map = new Map<string, BackupFile[]>();
  for (const e of entries) {
    const day = new Date(e.createdAt).toDateString();
    if (!map.has(day)) map.set(day, []);
    map.get(day)?.push(e);
  }
  return [...map.entries()].map(([, items]) => {
    const first = items[0];
    return [formatDayHeading(first ? first.createdAt : ""), items] as [string, BackupFile[]];
  });
}

export function HistoryPage() {
  const queryClient = useQueryClient();
  const [restoring, setRestoring] = useState<BackupFile | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const { data: backups, isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: api.getBackups,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => api.restoreBackup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["backups"] });
      setRestoreError(null);
      setRestoring(null);
    },
    onError: (err) => {
      setRestoreError(err instanceof Error ? err.message : "Restore failed. Please try again.");
    },
  });

  const backupList = backups ?? [];
  const groups = groupByDay(backupList);

  async function handleRestore() {
    if (!restoring) return;
    restoreMutation.mutate({ id: restoring.id });
  }

  if (isLoading) {
    return (
      <AppShell title="Change History">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading history...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Change History">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Change History</h1>
          <p className="text-text-secondary mt-1 text-sm">
            A backup is created before every edit or deletion. Restoring a version will back up the
            current state first.
          </p>
        </div>

        {groups.length === 0 && (
          <div className="text-center py-20 text-text-muted">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No changes recorded yet.</p>
            <p className="text-xs mt-1">
              Backups appear here after you edit settings or resources.
            </p>
          </div>
        )}

        {groups.map(([day, entries]) => (
          <div key={day}>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {day}
            </p>
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 px-4 py-3 ${
                    i < entries.length - 1 ? "border-b border-border-muted" : ""
                  }`}
                >
                  <span className="text-xs text-text-muted w-16 shrink-0 tabular-nums">
                    {formatTime(entry.createdAt)}
                  </span>
                  <span className="text-sm text-text-primary font-mono truncate flex-1 min-w-0">
                    {displayPath(entry.originalPath)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRestoring(entry)}
                    className="shrink-0 text-xs px-3 py-1 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={restoring !== null}
        title="Restore this version?"
        message={
          restoring
            ? `Restore ${displayPath(restoring.originalPath)} to its state from ${formatTime(restoring.createdAt)}? The current file will be backed up first.${restoreError ? `\n\nError: ${restoreError}` : ""}`
            : ""
        }
        confirmLabel={restoreMutation.isPending ? "Restoring\u2026" : "Restore"}
        onConfirm={handleRestore}
        onCancel={() => {
          setRestoring(null);
          setRestoreError(null);
        }}
      />
    </AppShell>
  );
}
