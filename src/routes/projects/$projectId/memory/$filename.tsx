import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { MarkdownViewer } from "@/components/files/MarkdownViewer.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { useToast } from "@/components/ui/Toast.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import { deleteMemory, getMemory, updateMemory } from "@/lib/api.js";

export function ProjectMemoryDetailPage() {
  const { projectId, filename } = useParams<{ projectId: string; filename: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"structured" | "raw">("structured");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const decodedFilename = decodeURIComponent(filename ?? "");

  const {
    data: file,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["memory", projectId, decodedFilename],
    queryFn: () => getMemory(decodedFilename, projectId ?? ""),
    enabled: !!projectId && !!decodedFilename,
  });

  const handleEdit = () => {
    setDraft(file?.content ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMemory({
        filename: decodedFilename,
        content: draft,
        projectId: projectId ?? "",
      });
      toast("Memory file saved");
      setEditing(false);
      await queryClient.invalidateQueries({
        queryKey: ["memory", projectId, decodedFilename],
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteMemory(decodedFilename, projectId ?? "");
      toast("Memory file deleted");
      await queryClient.invalidateQueries({ queryKey: ["memory", projectId] });
      navigate(`/projects/${projectId}/memory`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading…</div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load memory file</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to={`/projects/${projectId}/memory`}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to memory
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/15">
            <Brain className="w-4 h-4 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{file.filename}</h1>
          {!editing && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={handleEdit}
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
          <span>{file.filePath}</span>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            className="w-full min-h-[400px] rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2">
            <ViewToggle view={view} onChange={setView} />
          </div>
          {view === "structured" ? (
            <MarkdownViewer content={file.content} />
          ) : (
            <CodeViewer code={file.content} language="markdown" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Memory File"
        message={`Are you sure you want to delete "${file.filename}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
