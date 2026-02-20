import { useQuery } from "@tanstack/react-query";
import { Bot, Lock } from "lucide-react";
import { Link, useParams } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import * as api from "@/lib/api.js";
import { decodePath } from "@/lib/utils.js";

export function ProjectAgentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectPath = decodePath(projectId ?? "");

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", "project", projectPath],
    queryFn: () => api.getAgents("project", projectPath),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading agents...</div>
      </div>
    );
  }

  const agentList = agents ?? [];

  return (
    <ResourceListPage
      scope="project"
      projectPath={projectPath}
      resourceType="agent"
      typeLabel="Agent"
      subtitle={
        <p className="text-text-secondary">
          {agentList.length} agent definition{agentList.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/agents/</code>
        </p>
      }
    >
      <FileList emptyMessage="No project-level agents found">
        {agentList.map((agent) => (
          <Link
            key={agent.fileName}
            to={`/projects/${projectId}/agents/${agent.fileName.replace(".md", "")}`}
            className="block"
          >
            <FileCard
              name={agent.name}
              description={agent.description}
              fileName={agent.fileName}
              variant="agent"
              meta={{
                ...(agent.tools ? { tools: agent.tools } : {}),
                ...(!agent.isEditable ? { source: "plugin" } : {}),
              }}
              preview={agent.bodyPreview}
              icon={
                agent.isEditable ? (
                  <Bot className="w-4 h-4 text-accent" />
                ) : (
                  <Lock className="w-4 h-4 text-text-muted" />
                )
              }
            />
          </Link>
        ))}
      </FileList>
    </ResourceListPage>
  );
}
