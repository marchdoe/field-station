import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, FileText, Lock, Pencil, Terminal, Trash2 } from "lucide-react";
import { useState } from "react";
import { ResourceEditor } from "@/components/config/ResourceEditor.js";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { MarkdownViewer } from "@/components/files/MarkdownViewer.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { useToast } from "@/components/ui/Toast.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import { decodePath } from "@/lib/utils.js";
import { getCommand } from "@/server/functions/commands.js";
import { deleteResource, updateResource } from "@/server/functions/resource-mutations.js";

export const Route = createFileRoute("/projects/$projectId/commands/$folder/$commandName")({
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const command = await getCommand({
      data: {
        scope: "project",
        projectPath,
        folder: params.folder,
        name: params.commandName,
      },
    });
    return { command, projectId: params.projectId };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.command?.name ?? "Command"} - Field Station` }],
  }),
  component: ProjectCommandDetailPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading command...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load command</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

function ProjectCommandDetailPage() {
  const { command, projectId } = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<"structured" | "raw">("structured");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (_frontmatter: Record<string, string>, body: string) => {
    setSaving(true);
    try {
      await updateResource({
        data: { filePath: command.filePath, frontmatter: {}, body },
      });
      toast("Command updated successfully");
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
      await deleteResource({ data: { filePath: command.filePath } });
      toast("Command deleted");
      router.navigate({ to: "/projects/$projectId/commands", params: { projectId } });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/projects/$projectId/commands"
        params={{ projectId }}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to commands
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Terminal className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            /{command.folder}:{command.name}
          </h1>
          {!command.isEditable && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-surface-2 text-text-muted border border-border-muted">
              <Lock className="w-3 h-3" />
              Read-only
            </span>
          )}
          {command.isEditable && !editing && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
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
          <span>{command.filePath}</span>
        </div>
      </div>

      {editing ? (
        <ResourceEditor
          type="command"
          frontmatter={{}}
          body={command.body}
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
            <MarkdownViewer content={command.body} />
          ) : (
            <CodeViewer code={command.body} language="markdown" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Command"
        message={`Are you sure you want to delete "/${command.folder}:${command.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
