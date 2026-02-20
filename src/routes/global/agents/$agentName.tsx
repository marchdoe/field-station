import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { useParams } from "react-router";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import * as api from "@/lib/api.js";

export function GlobalAgentDetailPage() {
  const params = useParams();
  const agentName = params.agentName ?? "";

  const {
    data: agent,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agent", "global", agentName],
    queryFn: () => api.getAgent(agentName, "global"),
    enabled: agentName !== "",
  });

  if (isLoading) {
    return (
      <AppShell title="Agent">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading agent...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !agent) {
    return (
      <AppShell title="Agent">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load agent</p>
          <p className="text-text-muted text-sm mt-1">
            {error ? (error as Error).message : "Agent not found"}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={agent.name}>
      <ResourceDetailPage
        resourceType="agent"
        scope="global"
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
        backLink={{ label: "Back to agents", to: "/global/agents" }}
        deleteNavigate={{ to: "/global/agents" }}
      />
    </AppShell>
  );
}
