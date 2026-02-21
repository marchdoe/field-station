import { useQuery } from "@tanstack/react-query";
import { Lock, Zap } from "lucide-react";
import { Link, useParams } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import type { SkillFile } from "@/lib/api.js";
import * as api from "@/lib/api.js";

function buildSkillMeta(skill: SkillFile): Record<string, string> {
  const meta: Record<string, string> = {};
  const allowedTools = (skill as Record<string, unknown>).allowedTools;
  if (typeof allowedTools === "string") {
    meta["allowed-tools"] = allowedTools;
  }
  if (!skill.isEditable) {
    meta.source = "plugin";
  }
  return meta;
}

export function ProjectSkillsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills", "project", projectId],
    queryFn: () => api.getSkills("project", projectId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading skills...</div>
      </div>
    );
  }

  const skillList = skills ?? [];

  return (
    <ResourceListPage
      scope="project"
      projectId={projectId}
      resourceType="skill"
      typeLabel="Skill"
      subtitle={
        <p className="text-text-secondary">
          {skillList.length} skill{skillList.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/skills/</code>
        </p>
      }
    >
      <FileList emptyMessage="No project-level skills found">
        {skillList.map((skill) => (
          <Link
            key={skill.folderName}
            to={`/projects/${projectId}/skills/${skill.folderName}`}
            className="block"
          >
            <FileCard
              name={skill.name}
              description={skill.description}
              fileName={`${skill.folderName}/SKILL.md`}
              variant="skill"
              meta={buildSkillMeta(skill)}
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
    </ResourceListPage>
  );
}
