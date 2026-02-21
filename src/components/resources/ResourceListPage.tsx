import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateResourceDialog } from "@/components/config/CreateResourceDialog.js";
import { useToast } from "@/components/ui/Toast.js";
import { createResource } from "@/lib/api.js";

interface ResourceListPageProps {
  scope: "global" | "project";
  projectPath?: string;
  resourceType: "agent" | "command" | "skill";
  typeLabel: string;
  subtitle: React.ReactNode;
  existingFolders?: string[];
  children: React.ReactNode;
}

export function ResourceListPage({
  scope,
  projectPath,
  resourceType,
  typeLabel,
  subtitle,
  existingFolders,
  children,
}: ResourceListPageProps) {
  const queryClient = useQueryClient();
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
        scope,
        type: resourceType,
        name: data.name,
        ...(data.folder ? { folder: data.folder } : {}),
        ...(projectPath ? { projectPath } : {}),
        frontmatter: resourceType === "command" ? {} : data.frontmatter,
        body: data.body,
      });
      toast(`${typeLabel} created successfully`);
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: [`${resourceType}s`] });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {subtitle}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New {typeLabel}
        </button>
      </div>

      {children}

      <CreateResourceDialog
        type={resourceType}
        open={showCreate}
        saving={saving}
        existingFolders={existingFolders}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
