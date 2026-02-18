import { createFileRoute, useRouter } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { getBackups, restoreBackupFn } from "@/server/functions/backups.js";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "Change History - Field Station" }],
  }),
  loader: async () => {
    const backups = await getBackups();
    return { backups };
  },
  component: HistoryPage,
  pendingComponent: () => (
    <AppShell title="Change History">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading history...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Change History">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load history</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

interface BackupEntry {
  id: string;
  timestamp: string;
  originalPath: string;
  operation: "update" | "delete" | "move";
}

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
  // Replace home dir with ~
  const home = originalPath.match(/^\/(?:home|Users)\/[^/]+\//)?.[0];
  if (home) return originalPath.replace(home, "~/");
  return originalPath;
}

function groupByDay(entries: BackupEntry[]): [string, BackupEntry[]][] {
  const map = new Map<string, BackupEntry[]>();
  for (const e of entries) {
    const day = new Date(e.timestamp).toDateString();
    if (!map.has(day)) map.set(day, []);
    map.get(day)?.push(e);
  }
  return [...map.entries()].map(([, items]) => [formatDayHeading(items[0].timestamp), items]);
}

const operationBadge: Record<string, string> = {
  update: "text-text-muted bg-surface-2",
  delete: "text-danger bg-danger/10",
  move: "text-accent bg-accent-muted",
};

function HistoryPage() {
  const { backups } = Route.useLoaderData();
  const router = useRouter();
  const [restoring, setRestoring] = useState<BackupEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = groupByDay(backups);

  async function handleRestore() {
    if (!restoring) return;
    setBusy(true);
    try {
      await restoreBackupFn({ data: { backupId: restoring.id } });
      setRestoring(null);
      await router.invalidate();
    } finally {
      setBusy(false);
    }
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
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="text-sm text-text-primary font-mono truncate flex-1 min-w-0">
                    {displayPath(entry.originalPath)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      operationBadge[entry.operation] ?? operationBadge.update
                    }`}
                  >
                    {entry.operation}
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
            ? `Restore ${displayPath(restoring.originalPath)} to its state from ${formatTime(restoring.timestamp)}? The current file will be backed up first.`
            : ""
        }
        confirmLabel={busy ? "Restoring…" : "Restore"}
        onConfirm={handleRestore}
        onCancel={() => setRestoring(null)}
      />
    </AppShell>
  );
}
