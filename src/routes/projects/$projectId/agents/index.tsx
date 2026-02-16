import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Bot, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { CreateResourceDialog } from "@/components/config/CreateResourceDialog.js";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { useToast } from "@/components/ui/Toast.js";
import { decodePath } from "@/lib/utils.js";
import { listAgents } from "@/server/functions/agents.js";
import { createResource } from "@/server/functions/resource-mutations.js";

export const Route = createFileRoute("/projects/$projectId/agents/")({
  head: () => ({
    meta: [{ title: "Project Agents - Field Station" }],
  }),
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const agents = await listAgents({
      data: { scope: "project", projectPath },
    });
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
  const router = useRouter();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (data: {
    name: string;
    folder?: string;
    frontmatter: Record<string, string>;
    body: string;
  }) => {
    setSaving(true);
    try {
      await createResource({
        data: {
          scope: "project",
          type: "agent",
          name: data.name,
          projectPath,
          frontmatter: data.frontmatter,
          body: data.body,
        },
      });
      toast("Agent created successfully");
      setShowCreate(false);
      router.invalidate();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-text-secondary">
          {agents.length} agent definition{agents.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/agents/</code>
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

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

      <CreateResourceDialog
        type="agent"
        open={showCreate}
        saving={saving}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
