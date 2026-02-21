import { Outlet, useParams } from "react-router";
import { AppShell } from "@/components/layout/AppShell.js";
import { ProjectTabs } from "@/components/layout/ProjectTabs.js";
import { decodePath, getProjectName } from "@/lib/utils.js";

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectPath = decodePath(projectId ?? "");
  const name = getProjectName(projectPath);

  return (
    <AppShell title={name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{name}</h1>
          <p className="text-text-secondary mt-1">{projectPath}</p>
        </div>
        <ProjectTabs projectId={projectId ?? ""} />
        <Outlet />
      </div>
    </AppShell>
  );
}
