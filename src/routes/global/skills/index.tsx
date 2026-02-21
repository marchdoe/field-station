import { useQuery } from "@tanstack/react-query";
import { Lock, Zap } from "lucide-react";
import { Link } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import * as api from "@/lib/api.js";

export function GlobalSkillsPage() {
  const {
    data: skills = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["skills", "global"],
    queryFn: () => api.getSkills("global"),
  });

  if (isLoading) {
    return (
      <AppShell title="Global Skills">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading skills...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Global Skills">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load skills</p>
          <p className="text-text-muted text-sm mt-1">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Global Skills">
      <ResourceListPage
        scope="global"
        resourceType="skill"
        typeLabel="Skill"
        subtitle={
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Global Skills</h1>
            <p className="text-text-secondary mt-1">
              {skills.length} skill{skills.length !== 1 ? "s" : ""} from{" "}
              <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">~/.claude/skills/</code>
            </p>
          </div>
        }
      >
        <FileList emptyMessage="No skills found">
          {skills.map((skill) => (
            <Link
              key={skill.folderName}
              to={`/global/skills/${skill.folderName}`}
              className="block"
            >
              <FileCard
                name={skill.name}
                description={skill.description}
                fileName={`${skill.folderName}/SKILL.md`}
                variant="skill"
                meta={{
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
      </ResourceListPage>
    </AppShell>
  );
}
