import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Lock, Terminal } from "lucide-react";
import { Link } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import * as api from "@/lib/api.js";

export function GlobalCommandsPage() {
  const {
    data: commands = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["commands", "global"],
    queryFn: () => api.getCommands("global"),
  });

  if (isLoading) {
    return (
      <AppShell title="Global Commands">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading commands...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Global Commands">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load commands</p>
          <p className="text-text-muted text-sm mt-1">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </AppShell>
    );
  }

  const folders = [...new Set(commands.map((c) => c.folder))];

  return (
    <AppShell title="Global Commands">
      <ResourceListPage
        scope="global"
        resourceType="command"
        typeLabel="Command"
        existingFolders={folders}
        subtitle={
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Global Commands</h1>
            <p className="text-text-secondary mt-1">
              {commands.length} command{commands.length !== 1 ? "s" : ""} in {folders.length} folder
              {folders.length !== 1 ? "s" : ""} from{" "}
              <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">
                ~/.claude/commands/
              </code>
            </p>
          </div>
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
                    to={`/global/commands/${cmd.folder}/${cmd.name}`}
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
      </ResourceListPage>
    </AppShell>
  );
}
