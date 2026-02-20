import { useQuery } from "@tanstack/react-query";
import { Terminal } from "lucide-react";
import { useParams } from "react-router";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import * as api from "@/lib/api.js";

export function GlobalCommandDetailPage() {
  const params = useParams();
  const folder = params.folder ?? "";
  const commandName = params.commandName ?? "";

  const {
    data: command,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["command", "global", folder, commandName],
    queryFn: () => api.getCommand("global", folder, commandName),
    enabled: folder !== "" && commandName !== "",
  });

  if (isLoading) {
    return (
      <AppShell title="Command">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading command...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !command) {
    return (
      <AppShell title="Command">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load command</p>
          <p className="text-text-muted text-sm mt-1">
            {error ? (error as Error).message : "Command not found"}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`/${command.folder}:${command.name}`}>
      <ResourceDetailPage
        resourceType="command"
        scope="global"
        resource={{
          name: command.name,
          displayName: `/${command.folder}:${command.name}`,
          filePath: command.filePath,
          isEditable: command.isEditable,
          body: command.body,
          folder: command.folder,
        }}
        icon={<Terminal className="w-4.5 h-4.5 text-blue-500" />}
        iconBgClass="bg-blue-500/15"
        frontmatter={{}}
        backLink={{ label: "Back to commands", to: "/global/commands" }}
        deleteNavigate={{ to: "/global/commands" }}
      />
    </AppShell>
  );
}
