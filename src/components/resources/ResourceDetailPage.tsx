import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, FileText, Lock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ResourceEditor } from "@/components/config/ResourceEditor.js";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { MarkdownViewer } from "@/components/files/MarkdownViewer.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { useToast } from "@/components/ui/Toast.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import { deleteResource, updateResource } from "@/server/functions/resource-mutations.js";

interface Badge {
  label: string;
  value: string;
  swatch?: string;
}

interface ResourceDetailPageProps {
  resourceType: "agent" | "command" | "skill";
  resource: {
    name: string;
    displayName: string;
    filePath: string;
    isEditable: boolean;
    body: string;
    description?: string;
  };
  icon: React.ReactNode;
  iconBgClass: string;
  frontmatter: Record<string, string>;
  badges?: Badge[];
  backLink: { label: string; to: string; params?: Record<string, string> };
  deleteNavigate: { to: string; params?: Record<string, string> };
}

const TYPE_LABELS: Record<string, string> = {
  agent: "Agent",
  command: "Command",
  skill: "Skill",
};

export function ResourceDetailPage({
  resourceType,
  resource,
  icon,
  iconBgClass,
  frontmatter: initialFrontmatter,
  badges,
  backLink,
  deleteNavigate,
}: ResourceDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<"structured" | "raw">("structured");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeLabel = TYPE_LABELS[resourceType] ?? resourceType;

  const handleSave = async (frontmatter: Record<string, string>, body: string) => {
    setSaving(true);
    try {
      await updateResource({
        data: { filePath: resource.filePath, frontmatter, body },
      });
      toast(`${typeLabel} updated successfully`);
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
      await deleteResource({ data: { filePath: resource.filePath } });
      toast(`${typeLabel} deleted`);
      router.navigate({ to: deleteNavigate.to, params: deleteNavigate.params });
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
        to={backLink.to}
        params={backLink.params}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLink.label}
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBgClass}`}
          >
            {icon}
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{resource.displayName}</h1>
          {!resource.isEditable && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-surface-2 text-text-muted border border-border-muted">
              <Lock className="w-3 h-3" />
              Read-only
            </span>
          )}
          {resource.isEditable && !editing && (
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
          <span>{resource.filePath}</span>
        </div>
      </div>

      {!editing && resource.description && (
        <p className="text-text-secondary">{resource.description}</p>
      )}

      {!editing && badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs bg-surface-2 text-text-secondary border border-border-muted"
            >
              {badge.label}: {badge.value}
              {badge.swatch && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full border border-border-muted"
                  style={{ backgroundColor: badge.swatch }}
                />
              )}
            </span>
          ))}
        </div>
      )}

      {editing ? (
        <ResourceEditor
          type={resourceType}
          frontmatter={initialFrontmatter}
          body={resource.body}
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
            <MarkdownViewer content={resource.body} />
          ) : (
            <CodeViewer code={resource.body} language="markdown" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${typeLabel}`}
        message={`Are you sure you want to delete "${resource.displayName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
