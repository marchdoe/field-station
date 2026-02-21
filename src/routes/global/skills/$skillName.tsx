import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useParams } from "react-router";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import * as api from "@/lib/api.js";

export function GlobalSkillDetailPage() {
  const params = useParams();
  const skillName = params.skillName ?? "";

  const {
    data: skill,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["skill", "global", skillName],
    queryFn: () => api.getSkill("global", skillName),
    enabled: skillName !== "",
  });

  if (isLoading) {
    return (
      <AppShell title="Skill">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading skill...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !skill) {
    return (
      <AppShell title="Skill">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load skill</p>
          <p className="text-text-muted text-sm mt-1">
            {error ? (error instanceof Error ? error.message : String(error)) : "Skill not found"}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={skill.name}>
      <ResourceDetailPage
        resourceType="skill"
        scope="global"
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
        }}
        badges={[]}
        backLink={{ label: "Back to skills", to: "/global/skills" }}
        deleteNavigate={{ to: "/global/skills" }}
      />
    </AppShell>
  );
}
