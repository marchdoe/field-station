import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bot, FileText, Lock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ResourceEditor } from "@/components/config/ResourceEditor.js";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { MarkdownViewer } from "@/components/files/MarkdownViewer.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { useToast } from "@/components/ui/Toast.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import { getAgent } from "@/server/functions/agents.js";
import { deleteResource, updateResource } from "@/server/functions/resource-mutations.js";

export const Route = createFileRoute("/global/agents/$agentName")({
  loader: async ({ params }) => {
    const agent = await getAgent({
      data: {
        scope: "global",
        name: params.agentName,
      },
    });
    return agent;
  },
  component: GlobalAgentDetailPage,
  pendingComponent: () => (
    <AppShell title="Agent">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading agent...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Agent">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load agent</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalAgentDetailPage() {
  const agent = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<"structured" | "raw">("structured");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (frontmatter: Record<string, string>, body: string) => {
    setSaving(true);
    try {
      await updateResource({
        data: { filePath: agent.filePath, frontmatter, body },
      });
      toast("Agent updated successfully");
      setEditing(false);
      router.invalidate();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteResource({ data: { filePath: agent.filePath } });
      toast("Agent deleted");
      router.navigate({ to: "/global/agents" });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <AppShell title={agent.name}>
      <div className="space-y-6">
        <Link
          to="/global/agents"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to agents
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Bot
                className="w-4.5 h-4.5 text-accent"
                style={agent.color ? { color: agent.color } : undefined}
              />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{agent.name}</h1>
            {!agent.isEditable && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-surface-2 text-text-muted border border-border-muted">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            )}
            {agent.isEditable && !editing && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-11 text-sm text-text-muted">
            <FileText className="w-3.5 h-3.5" />
            <span>{agent.filePath}</span>
          </div>
        </div>

        {!editing && agent.description && (
          <p className="text-text-secondary">{agent.description}</p>
        )}

        {!editing && (agent.tools || agent.color) && (
          <div className="flex flex-wrap gap-1.5">
            {agent.tools && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-surface-2 text-text-secondary border border-border-muted">
                tools: {agent.tools}
              </span>
            )}
            {agent.color && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs bg-surface-2 text-text-secondary border border-border-muted">
                color:
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full border border-border-muted"
                  style={{ backgroundColor: agent.color }}
                />
                {agent.color}
              </span>
            )}
          </div>
        )}

        {editing ? (
          <ResourceEditor
            type="agent"
            frontmatter={{
              name: agent.name,
              description: agent.description,
              ...(agent.tools ? { tools: agent.tools } : {}),
              ...(agent.color ? { color: agent.color } : {}),
            }}
            body={agent.body}
            saving={saving}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <div className="mb-2">
              <ViewToggle view={view} onChange={setView} />
            </div>
            {view === "structured" ? (
              <MarkdownViewer content={agent.body} />
            ) : (
              <CodeViewer code={agent.body} language="markdown" />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Agent"
        message={`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  );
}
