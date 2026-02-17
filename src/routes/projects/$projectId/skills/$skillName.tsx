import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import { decodePath } from "@/lib/utils.js";
import { getSkill } from "@/server/functions/skills.js";

export const Route = createFileRoute("/projects/$projectId/skills/$skillName")({
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const skill = await getSkill({
      data: { scope: "project", projectPath, folderName: params.skillName },
    });
    return { skill, projectId: params.projectId };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.skill?.name ?? "Skill"} - Field Station` }],
  }),
  component: ProjectSkillDetailPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading skill...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load skill</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

function ProjectSkillDetailPage() {
  const { skill, projectId } = Route.useLoaderData();

  return (
    <ResourceDetailPage
      resourceType="skill"
      resource={{
        name: skill.name,
        displayName: skill.name,
        filePath: skill.filePath,
        isEditable: skill.isEditable,
        body: skill.body,
        description: skill.description,
      }}
      icon={<Zap className="w-4.5 h-4.5 text-amber-500" />}
      iconBgClass="bg-amber-500/15"
      frontmatter={{
        name: skill.name,
        description: skill.description,
        ...(skill.allowedTools ? { "allowed-tools": skill.allowedTools } : {}),
      }}
      badges={skill.allowedTools ? [{ label: "allowed-tools", value: skill.allowedTools }] : []}
      backLink={{
        label: "Back to skills",
        to: "/projects/$projectId/skills",
        params: { projectId },
      }}
      deleteNavigate={{ to: "/projects/$projectId/skills", params: { projectId } }}
    />
  );
}
