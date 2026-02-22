import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { MarkdownViewer } from "@/components/files/MarkdownViewer.js";
import { useToast } from "@/components/ui/Toast.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import type { InstructionsFile } from "@/lib/api.js";
import { updateInstruction } from "@/lib/api.js";

interface InstructionsFileSectionProps {
  label: string;
  file: InstructionsFile;
  fileKey: "main" | "local";
  scope: "global" | "project";
  projectId?: string;
  queryKey: unknown[];
}

export function InstructionsFileSection({
  label,
  file,
  fileKey,
  scope,
  projectId,
  queryKey,
}: InstructionsFileSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"structured" | "raw">("structured");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setDraft(file.content ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateInstruction({ scope, file: fileKey, content: draft, projectId });
      toast(`${label} saved`);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <FileText className="w-3.5 h-3.5" />
          <span>{file.filePath}</span>
        </div>
        {!file.exists && (
          <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
            Not found
          </span>
        )}
        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            className="ml-auto text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg px-3 py-1.5 transition-colors"
          >
            {file.exists ? "Edit" : "Create"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            className="w-full min-h-[300px] rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
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
      ) : file.exists && file.content !== null && file.content !== undefined ? (
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
      ) : (
        <p className="text-sm text-text-muted italic">
          File does not exist yet. Click Create to add it.
        </p>
      )}
    </div>
  );
}
