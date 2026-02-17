import { createFileRoute } from "@tanstack/react-router";
import { Terminal } from "lucide-react";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import { decodePath } from "@/lib/utils.js";
import { getCommand } from "@/server/functions/commands.js";

export const Route = createFileRoute("/projects/$projectId/commands/$folder/$commandName")({
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const command = await getCommand({
      data: { scope: "project", projectPath, folder: params.folder, name: params.commandName },
    });
    return { command, projectId: params.projectId };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.command?.name ?? "Command"} - Field Station` }],
  }),
  component: ProjectCommandDetailPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading command...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load command</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

function ProjectCommandDetailPage() {
  const { command, projectId } = Route.useLoaderData();

  return (
    <ResourceDetailPage
      resourceType="command"
      resource={{
        name: command.name,
        displayName: `/${command.folder}:${command.name}`,
        filePath: command.filePath,
        isEditable: command.isEditable,
        body: command.body,
      }}
      icon={<Terminal className="w-4.5 h-4.5 text-blue-500" />}
      iconBgClass="bg-blue-500/15"
      frontmatter={{}}
      backLink={{
        label: "Back to commands",
        to: "/projects/$projectId/commands",
        params: { projectId },
      }}
      deleteNavigate={{ to: "/projects/$projectId/commands", params: { projectId } }}
    />
  );
}
