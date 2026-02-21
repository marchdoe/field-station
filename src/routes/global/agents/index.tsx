import { useQuery } from "@tanstack/react-query";
import { Bot, Lock } from "lucide-react";
import { Link } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import * as api from "@/lib/api.js";

export function GlobalAgentsPage() {
  const {
    data: agents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agents", "global"],
    queryFn: () => api.getAgents("global"),
  });

  if (isLoading) {
    return (
      <AppShell title="Global Agents">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading agents...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Global Agents">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load agents</p>
          <p className="text-text-muted text-sm mt-1">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Global Agents">
      <ResourceListPage
        scope="global"
        resourceType="agent"
        typeLabel="Agent"
        subtitle={
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Global Agents</h1>
            <p className="text-text-secondary mt-1">
              {agents.length} agent definition{agents.length !== 1 ? "s" : ""} from{" "}
              <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">~/.claude/agents/</code>
            </p>
          </div>
        }
      >
        <FileList emptyMessage="No agents found">
          {agents.map((agent) => (
            <Link
              key={agent.fileName}
              to={`/global/agents/${agent.fileName.replace(".md", "")}`}
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
    </AppShell>
  );
}
