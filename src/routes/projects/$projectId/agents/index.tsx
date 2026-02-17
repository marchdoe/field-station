import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Lock } from "lucide-react";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import { decodePath } from "@/lib/utils.js";
import { listAgents } from "@/server/functions/agents.js";

export const Route = createFileRoute("/projects/$projectId/agents/")({
  head: () => ({ meta: [{ title: "Project Agents - Field Station" }] }),
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const agents = await listAgents({ data: { scope: "project", projectPath } });
    return { agents, projectId: params.projectId, projectPath };
  },
  component: ProjectAgentsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading agents...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load agents</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

function ProjectAgentsPage() {
  const { agents, projectId, projectPath } = Route.useLoaderData();

  return (
    <ResourceListPage
      scope="project"
      projectPath={projectPath}
      resourceType="agent"
      typeLabel="Agent"
      subtitle={
        <p className="text-text-secondary">
          {agents.length} agent definition{agents.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/agents/</code>
        </p>
      }
    >
      <FileList emptyMessage="No project-level agents found">
        {agents.map((agent) => (
          <Link
            key={agent.fileName}
            to="/projects/$projectId/agents/$agentName"
            params={{ projectId, agentName: agent.fileName.replace(".md", "") }}
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
