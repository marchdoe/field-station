import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useParams } from "react-router";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import * as api from "@/lib/api.js";
import { decodePath } from "@/lib/utils.js";

export function ProjectSkillDetailPage() {
  const { projectId, skillName } = useParams<{ projectId: string; skillName: string }>();
  const projectPath = decodePath(projectId ?? "");

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", "project", projectPath, skillName],
    queryFn: () => api.getSkill("project", skillName ?? "", projectPath),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading skill...</div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Skill not found</p>
      </div>
    );
  }

  const allowedTools = typeof skill.allowedTools === "string" ? skill.allowedTools : undefined;

  return (
    <ResourceDetailPage
      resourceType="skill"
      scope="project"
      projectPath={projectPath}
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
        ...(allowedTools ? { "allowed-tools": allowedTools } : {}),
      }}
      badges={allowedTools ? [{ label: "allowed-tools", value: allowedTools }] : []}
      backLink={{
        label: "Back to skills",
        to: `/projects/${projectId}/skills`,
      }}
      deleteNavigate={{ to: `/projects/${projectId}/skills` }}
    />
  );
}
