import { useQuery } from "@tanstack/react-query";
import { Terminal } from "lucide-react";
import { useParams } from "react-router";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import * as api from "@/lib/api.js";
import { decodePath } from "@/lib/utils.js";

export function ProjectCommandDetailPage() {
  const { projectId, folder, commandName } = useParams<{
    projectId: string;
    folder: string;
    commandName: string;
  }>();
  const projectPath = decodePath(projectId ?? "");

  const { data: command, isLoading } = useQuery({
    queryKey: ["command", "project", projectPath, folder, commandName],
    queryFn: () => api.getCommand("project", folder ?? "", commandName ?? "", projectPath),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading command...</div>
      </div>
    );
  }

  if (!command) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Command not found</p>
      </div>
    );
  }

  return (
    <ResourceDetailPage
      resourceType="command"
      scope="project"
      projectPath={projectPath}
      resource={{
        name: command.name,
        displayName: `/${command.folder}:${command.name}`,
        filePath: command.filePath,
        isEditable: command.isEditable,
        body: command.body,
        folder: command.folder,
      }}
      icon={<Terminal className="w-4.5 h-4.5 text-blue-500" />}
      iconBgClass="bg-blue-500/15"
      frontmatter={{}}
      backLink={{
        label: "Back to commands",
        to: `/projects/${projectId}/commands`,
      }}
      deleteNavigate={{ to: `/projects/${projectId}/commands` }}
    />
  );
}
