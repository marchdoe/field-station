import { useQuery } from "@tanstack/react-query";
import { History, Radio, Settings } from "lucide-react";
import { Link } from "react-router";
import { AppShell } from "@/components/layout/AppShell.js";
import { ProjectCard } from "@/components/ProjectCard.js";
import * as api from "@/lib/api.js";

export function DashboardPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading...</div>
        </div>
      </AppShell>
    );
  }

  const projectList = projects ?? [];
  const needsSetup = projectList.length === 0;

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
            <h2 className="text-lg font-semibold text-text-primary">Projects</h2>
            <Link
              to="/projects"
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectList.map((project) => (
              <ProjectCard key={project.path} project={project} />
            ))}
          </div>
        </div>

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

