import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Lock, Terminal } from "lucide-react";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import { decodePath } from "@/lib/utils.js";
import { listCommands } from "@/server/functions/commands.js";

export const Route = createFileRoute("/projects/$projectId/commands/")({
  head: () => ({ meta: [{ title: "Project Commands - Field Station" }] }),
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const result = await listCommands({ data: { scope: "project", projectPath } });
    return { ...result, projectId: params.projectId, projectPath };
  },
  component: ProjectCommandsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading commands...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load commands</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

function ProjectCommandsPage() {
  const { folders, commands, projectId, projectPath } = Route.useLoaderData();

  return (
    <ResourceListPage
      scope="project"
      projectPath={projectPath}
      resourceType="command"
      typeLabel="Command"
      existingFolders={folders}
      subtitle={
        <p className="text-text-secondary">
          {commands.length} command{commands.length !== 1 ? "s" : ""} in {folders.length} folder
          {folders.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/commands/</code>
        </p>
      }
    >
      {folders.map((folder) => {
        const folderCommands = commands.filter((c) => c.folder === folder);
        return (
          <div key={folder}>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">{folder}/</h2>
              <span className="text-sm text-text-muted">({folderCommands.length} commands)</span>
            </div>
            <FileList emptyMessage="No commands">
              {folderCommands.map((cmd) => (
                <Link
                  key={cmd.filePath}
                  to="/projects/$projectId/commands/$folder/$commandName"
                  params={{ projectId, folder: cmd.folder, commandName: cmd.name }}
                  className="block"
                >
                  <FileCard
                    name={`/${folder}:${cmd.name}`}
                    fileName={cmd.fileName}
                    variant="command"
                    preview={cmd.bodyPreview}
                    icon={
                      cmd.isEditable ? (
                        <Terminal className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-text-muted" />
                      )
                    }
                  />
                </Link>
              ))}
            </FileList>
          </div>
        );
      })}

      {commands.length === 0 && (
        <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
          No project-level commands found
        </div>
      )}
    </ResourceListPage>
  );
}
