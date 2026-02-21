import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Radio } from "lucide-react";
import { useNavigate } from "react-router";
import type { ProjectFile } from "@/lib/api.js";
import * as api from "@/lib/api.js";
import { getProjectName } from "@/lib/utils.js";

export function SetupPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  const projectList = projects ?? [];

  function handleContinue() {
    void navigate("/");
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
            Projects are automatically loaded from{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded text-accent">
              ~/.claude/projects/
            </code>
            . No registration required.
          </p>
        </div>

        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border-muted flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-muted">
              {isLoading
                ? "Scanning for projects..."
                : `${projectList.length} project${projectList.length !== 1 ? "s" : ""} discovered from ~/.claude/projects/`}
            </span>
          </div>

          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="animate-pulse text-text-muted text-sm">Scanning for projects...</div>
            </div>
          ) : (
            <div className="divide-y divide-border-muted max-h-96 overflow-y-auto">
              {projectList.map((project) => (
                <ProjectRow key={project.path} project={project} />
              ))}
              {projectList.length === 0 && (
                <div className="px-4 py-8 text-center text-text-muted text-sm">
                  No projects found in ~/.claude/projects/
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {projectList.length} project{projectList.length !== 1 ? "s" : ""} available
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors bg-accent text-white hover:bg-accent-hover"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectFile }) {
  const name = getProjectName(project.path);

  return (
    <div className="w-full flex items-center gap-3 px-4 py-3">
      <FolderOpen className="w-4 h-4 flex-shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-muted truncate">{project.path}</p>
      </div>
    </div>
  );
}
