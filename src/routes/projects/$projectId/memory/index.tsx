import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { useToast } from "@/components/ui/Toast.js";
import { createMemory, listMemory } from "@/lib/api.js";

export function ProjectMemoryListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["memory", projectId],
    queryFn: () => listMemory(projectId ?? ""),
    enabled: !!projectId,
  });

  const handleCreate = async () => {
    const filename = newFilename.trim().endsWith(".md")
      ? newFilename.trim()
      : `${newFilename.trim()}.md`;
    setSaving(true);
    try {
      await createMemory({ filename, content: "", projectId: projectId ?? "" });
      toast("Memory file created");
      setShowCreate(false);
      setNewFilename("");
      await queryClient.invalidateQueries({ queryKey: ["memory", projectId] });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load memory files</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary">
            {files.length} file{files.length !== 1 ? "s" : ""} in{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">memory/</code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Memory File
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border-default bg-surface-1 p-4 space-y-3">
          <p className="text-sm font-medium text-text-primary">New memory file</p>
          <input
            type="text"
            placeholder="filename.md"
            value={newFilename}
            onChange={(e) => setNewFilename(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !newFilename.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewFilename("");
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <FileList emptyMessage="No memory files yet">
        {files.map((file) => (
          <Link
            key={file.filename}
            to={`/projects/${projectId}/memory/${encodeURIComponent(file.filename)}`}
            className="block"
          >
            <FileCard
              name={file.filename}
              fileName={file.filePath}
              variant="memory"
              preview={file.preview}
              icon={<Brain className="w-4 h-4 text-purple-500" />}
            />
          </Link>
        ))}
      </FileList>
    </div>
  );
}
