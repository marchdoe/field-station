import { createFileRoute } from "@tanstack/react-router";
import { Terminal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceDetailPage } from "@/components/resources/ResourceDetailPage.js";
import { getCommand } from "@/server/functions/commands.js";

export const Route = createFileRoute("/global/commands/$folder/$commandName")({
  loader: async ({ params }) => {
    return getCommand({
      data: { scope: "global", folder: params.folder, name: params.commandName },
    });
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name ?? "Command"} - Field Station` }],
  }),
  component: GlobalCommandDetailPage,
  pendingComponent: () => (
    <AppShell title="Command">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading command...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Command">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load command</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalCommandDetailPage() {
  const command = Route.useLoaderData();

  return (
    <AppShell title={`/${command.folder}:${command.name}`}>
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
        backLink={{ label: "Back to commands", to: "/global/commands" }}
        deleteNavigate={{ to: "/global/commands" }}
      />
    </AppShell>
  );
}
