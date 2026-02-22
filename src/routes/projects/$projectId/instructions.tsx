import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { InstructionsFileSection } from "@/components/layout/InstructionsFileSection.js";
import { getInstructions } from "@/lib/api.js";

export function ProjectInstructionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryKey = ["instructions", "project", projectId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getInstructions("project", projectId ?? ""),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load instructions</p>
        <p className="text-text-muted text-sm mt-1">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">CLAUDE.md</h2>
        <p className="text-sm text-text-muted mb-4">
          Project instructions Claude reads at the start of every session.
        </p>
        <InstructionsFileSection
          label="CLAUDE.md"
          file={data.main}
          fileKey="main"
          scope="project"
          projectId={projectId}
          queryKey={queryKey}
        />
      </div>

      <div className="border-t border-border-muted pt-8">
        <h2 className="text-lg font-semibold text-text-primary mb-1">CLAUDE.local.md</h2>
        <p className="text-sm text-text-muted mb-4">
          Local overrides — gitignored, not shared with teammates.
        </p>
        <InstructionsFileSection
          label="CLAUDE.local.md"
          file={data.local}
          fileKey="local"
          scope="project"
          projectId={projectId}
          queryKey={queryKey}
        />
      </div>
    </div>
  );
}
