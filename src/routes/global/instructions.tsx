import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import { InstructionsFileSection } from "@/components/layout/InstructionsFileSection.js";
import { getInstructions } from "@/lib/api.js";

export function GlobalInstructionsPage() {
  const queryKey = ["instructions", "global"];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getInstructions("global"),
  });

  if (isLoading) {
    return (
      <AppShell title="Global Instructions">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading…</div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Global Instructions">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load instructions</p>
          <p className="text-text-muted text-sm mt-1">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Global Instructions">
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-green-600/15">
              <BookOpen className="w-4 h-4 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Global Instructions</h1>
          </div>
          <p className="text-text-secondary mt-1 ml-11">
            Instructions Claude reads on every session from{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">~/.claude/</code>
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">CLAUDE.md</h2>
            <InstructionsFileSection
              label="CLAUDE.md"
              file={data.main}
              fileKey="main"
              scope="global"
              queryKey={queryKey}
            />
          </div>

          <div className="border-t border-border-muted pt-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">CLAUDE.local.md</h2>
            <p className="text-sm text-text-muted mb-4">
              Local overrides — not committed to version control.
            </p>
            <InstructionsFileSection
              label="CLAUDE.local.md"
              file={data.local}
              fileKey="local"
              scope="global"
              queryKey={queryKey}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
