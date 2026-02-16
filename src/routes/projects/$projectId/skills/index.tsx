import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Lock, Plus, Zap } from "lucide-react";
import { useState } from "react";
import { CreateResourceDialog } from "@/components/config/CreateResourceDialog.js";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { useToast } from "@/components/ui/Toast.js";
import { decodePath } from "@/lib/utils.js";
import { createResource } from "@/server/functions/resource-mutations.js";
import { listSkills } from "@/server/functions/skills.js";

export const Route = createFileRoute("/projects/$projectId/skills/")({
  head: () => ({
    meta: [{ title: "Project Skills - Field Station" }],
  }),
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const skills = await listSkills({
      data: { scope: "project", projectPath },
    });
    return { skills, projectId: params.projectId, projectPath };
  },
  component: ProjectSkillsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading skills...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load skills</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

function ProjectSkillsPage() {
  const { skills, projectId, projectPath } = Route.useLoaderData();
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
          type: "skill",
          name: data.name,
          projectPath,
          frontmatter: data.frontmatter,
          body: data.body,
        },
      });
      toast("Skill created successfully");
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
          {skills.length} skill{skills.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/skills/</code>
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Skill
        </button>
      </div>

      <FileList emptyMessage="No project-level skills found">
        {skills.map((skill) => (
          <Link
            key={skill.folderName}
            to="/projects/$projectId/skills/$skillName"
            params={{ projectId, skillName: skill.folderName }}
            className="block"
          >
            <FileCard
              name={skill.name}
              description={skill.description}
              fileName={`${skill.folderName}/SKILL.md`}
              variant="skill"
              meta={{
                ...(skill.allowedTools ? { "allowed-tools": skill.allowedTools } : {}),
                ...(!skill.isEditable ? { source: "plugin" } : {}),
              }}
              preview={skill.bodyPreview}
              icon={
                skill.isEditable ? (
                  <Zap className="w-4 h-4 text-amber-500" />
                ) : (
                  <Lock className="w-4 h-4 text-text-muted" />
                )
              }
            />
          </Link>
        ))}
      </FileList>

      <CreateResourceDialog
        type="skill"
        open={showCreate}
        saving={saving}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
