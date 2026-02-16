import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FolderOpen, Radio, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils.js";
import { registerProjects, scanForProjects } from "@/server/functions/projects.js";
import type { ProjectInfo } from "@/types/config.js";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [{ title: "Setup - Field Station" }],
  }),
  loader: async () => {
    const projects = await scanForProjects();
    return { projects };
  },
  component: SetupPage,
  pendingComponent: () => (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="animate-pulse text-text-muted">Scanning for projects...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 max-w-lg">
        <p className="text-danger font-medium">Failed to scan for projects</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </div>
  ),
});

function SetupPage() {
  const { projects } = Route.useLoaderData();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(projects.filter((p) => p.exists).map((p) => p.decodedPath)),
  );
  const [saving, setSaving] = useState(false);

  function toggleProject(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  async function handleFinish() {
    setSaving(true);
    await registerProjects({ data: { paths: Array.from(selected) } });
    await navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-4">
            <Radio className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Field Station Setup</h1>
          <p className="text-text-secondary">
            We found {projects.length} project{projects.length !== 1 ? "s" : ""} in your Claude Code
            configuration. Select which ones to track.
          </p>
        </div>

        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border-muted flex items-center gap-2">
            <Search className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-muted">
              Discovered from <code className="text-accent">~/.claude/projects/</code>
            </span>
          </div>

          <div className="divide-y divide-border-muted max-h-96 overflow-y-auto">
            {projects.map((project) => (
              <ProjectRow
                key={project.encodedPath}
                project={project}
                selected={selected.has(project.decodedPath)}
                onToggle={() => toggleProject(project.decodedPath)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {selected.size} project{selected.size !== 1 ? "s" : ""} selected
          </p>
          <button
            onClick={handleFinish}
            disabled={saving || selected.size === 0}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors",
              selected.size > 0
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-surface-3 text-text-muted cursor-not-allowed",
            )}
          >
            {saving ? "Saving..." : "Continue to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  selected,
  onToggle,
}: {
  project: ProjectInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = project.decodedPath.split("/").filter(Boolean).pop() ?? project.decodedPath;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        selected ? "bg-accent-muted/50" : "hover:bg-surface-2",
        !project.exists && "opacity-50",
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          selected ? "bg-accent border-accent text-white" : "border-border-default",
        )}
      >
        {selected && <Check className="w-3 h-3" />}
      </div>
      <FolderOpen
        className={cn("w-4 h-4 flex-shrink-0", selected ? "text-accent" : "text-text-muted")}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-muted truncate">{project.decodedPath}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {project.hasClaudeMd && (
          <span className="text-xs bg-surface-2 px-2 py-0.5 rounded-full text-text-muted">
            CLAUDE.md
          </span>
        )}
        {!project.exists && (
          <span className="text-xs bg-danger/10 px-2 py-0.5 rounded-full text-danger">
            Not found
          </span>
        )}
      </div>
    </button>
  );
}
