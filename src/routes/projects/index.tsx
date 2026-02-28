import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell.js";
import { ProjectCard } from "@/components/ProjectCard.js";
import * as api from "@/lib/api.js";

export function ProjectsListPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  const projectList = projects ?? [];

  return (
    <AppShell title="Projects">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="text-text-secondary mt-1">
            {isLoading
              ? "Loading projects..."
              : `${projectList.length} project${projectList.length !== 1 ? "s" : ""} from ~/.claude/projects/`}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-text-muted">Loading projects...</div>
          </div>
        )}

        {!isLoading && projectList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectList.map((project) => (
              <ProjectCard key={project.path} project={project} />
            ))}
          </div>
        )}

        {!isLoading && projectList.length === 0 && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
            No projects found in ~/.claude/projects/
          </div>
        )}
      </div>
    </AppShell>
  );
}

