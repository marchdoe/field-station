import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { FolderOpen, History, Radio, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import type { ProjectInfo } from "@/types/config.js";

const rootApi = getRouteApi("__root__");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dashboard - Field Station" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { projects, registeredPaths } = rootApi.useLoaderData();
  const needsSetup = registeredPaths.length === 0;

  if (needsSetup) {
    return (
      <AppShell title="Dashboard">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-muted mb-6">
            <Radio className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-3">Welcome to Field Station</h1>
          <p className="text-text-secondary text-lg mb-8">
            Your local Claude Code configuration explorer. Let&apos;s get started by discovering
            your projects.
          </p>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors"
          >
            <Settings className="w-4 h-4" />
            Run Setup
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Overview of your Claude Code configuration</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Registered Projects</h2>
            <Link
              to="/projects"
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.encodedPath} project={project} />
            ))}
          </div>
        </div>

        {/* Change history — muted, rarely needed */}
        <div className="pt-4 border-t border-border-muted">
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Change history
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function ProjectCard({ project }: { project: ProjectInfo }) {
  const name = project.decodedPath.split("/").filter(Boolean).pop() ?? project.decodedPath;

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.encodedPath }}
      className="bg-surface-1 border border-border-default rounded-xl p-4 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <FolderOpen className="w-5 h-5 text-accent" />
        <h3 className="font-semibold text-text-primary truncate">{name}</h3>
      </div>
      <p className="text-sm text-text-muted truncate mb-3">{project.decodedPath}</p>
      <div className="flex gap-3 text-xs text-text-muted">
        {project.hasClaudeMd && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full">CLAUDE.md</span>
        )}
        {project.agentCount > 0 && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full">{project.agentCount} agents</span>
        )}
        {project.commandCount > 0 && (
          <span className="bg-surface-2 px-2 py-0.5 rounded-full">
            {project.commandCount} commands
          </span>
        )}
      </div>
    </Link>
  );
}
