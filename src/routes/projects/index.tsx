import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, FileText, FolderOpen, Terminal, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import { cn } from "@/lib/utils.js";
import { getRegisteredProjects, scanForProjects } from "@/server/functions/projects.js";
import type { ProjectInfo } from "@/types/config.js";

export const Route = createFileRoute("/projects/")({
  loader: async () => {
    const [projects, registeredPaths] = await Promise.all([
      scanForProjects(),
      getRegisteredProjects(),
    ]);
    return { projects, registeredPaths };
  },
  component: ProjectsListPage,
  pendingComponent: () => (
    <AppShell title="Projects">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading projects...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Projects">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load projects</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function ProjectsListPage() {
  const { projects, registeredPaths } = Route.useLoaderData();

  const registered = projects.filter((p) => registeredPaths.includes(p.decodedPath));
  const unregistered = projects.filter((p) => !registeredPaths.includes(p.decodedPath));

  return (
    <AppShell title="Projects">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="text-text-secondary mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""} discovered,{" "}
            {registered.length} registered
          </p>
        </div>

        {registered.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Registered Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {registered.map((project) => (
                <ProjectCard key={project.encodedPath} project={project} registered />
              ))}
            </div>
          </div>
        )}

        {unregistered.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Other Discovered Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {unregistered.map((project) => (
                <ProjectCard key={project.encodedPath} project={project} registered={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ProjectCard({ project, registered }: { project: ProjectInfo; registered: boolean }) {
  const name = project.decodedPath.split("/").filter(Boolean).pop() ?? project.decodedPath;

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.encodedPath }}
      className={cn(
        "bg-surface-1 border rounded-xl p-4 transition-colors",
        registered
          ? "border-border-default hover:border-accent/40"
          : "border-border-muted opacity-70 hover:opacity-100",
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <FolderOpen className={cn("w-5 h-5", registered ? "text-accent" : "text-text-muted")} />
        <h3 className="font-semibold text-text-primary truncate">{name}</h3>
      </div>
      <p className="text-sm text-text-muted truncate mb-3">{project.decodedPath}</p>
      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
        {!project.exists && (
          <span className="bg-danger/10 px-2 py-0.5 rounded-full text-danger">Not found</span>
        )}
        {project.hasClaudeMd && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full flex items-center gap-1">
            <FileText className="w-3 h-3" /> CLAUDE.md
          </span>
        )}
        {project.agentCount > 0 && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Bot className="w-3 h-3" /> {project.agentCount}
          </span>
        )}
        {project.commandCount > 0 && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Terminal className="w-3 h-3" /> {project.commandCount}
          </span>
        )}
        {project.skillCount > 0 && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Zap className="w-3 h-3" /> {project.skillCount}
          </span>
        )}
      </div>
    </Link>
  );
}
