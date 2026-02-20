import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { useParams } from "react-router";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import * as api from "@/lib/api.js";
import { decodePath } from "@/lib/utils.js";

export function ProjectAgentDetailPage() {
  const { projectId, agentName } = useParams<{ projectId: string; agentName: string }>();
  const projectPath = decodePath(projectId ?? "");

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", "project", projectPath, agentName],
    queryFn: () => api.getAgent(agentName ?? "", "project", projectPath),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading agent...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Agent not found</p>
      </div>
    );
  }

  return (
    <ResourceDetailPage
      resourceType="agent"
      scope="project"
      projectPath={projectPath}
      resource={{
        name: agent.name,
        displayName: agent.name,
        filePath: agent.filePath,
        isEditable: agent.isEditable,
        body: agent.body,
        description: agent.description,
      }}
      icon={
        <Bot
          className="w-4.5 h-4.5 text-accent"
          style={agent.color ? { color: agent.color } : undefined}
        />
      }
      iconBgClass="bg-accent/15"
      frontmatter={{
        name: agent.name,
        description: agent.description,
        ...(agent.tools ? { tools: agent.tools } : {}),
        ...(agent.color ? { color: agent.color } : {}),
      }}
      badges={[
        ...(agent.tools ? [{ label: "tools", value: agent.tools }] : []),
        ...(agent.color ? [{ label: "color", value: agent.color, swatch: agent.color }] : []),
      ]}
      backLink={{
        label: "Back to agents",
        to: `/projects/${projectId}/agents`,
      }}
      deleteNavigate={{ to: `/projects/${projectId}/agents` }}
    />
  );
}
