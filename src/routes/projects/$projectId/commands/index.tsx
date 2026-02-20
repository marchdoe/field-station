import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Lock, Terminal } from "lucide-react";
import { Link, useParams } from "react-router";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { ResourceListPage } from "@/components/resources/ResourceListPage.js";
import * as api from "@/lib/api.js";
import { decodePath } from "@/lib/utils.js";

export function ProjectCommandsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectPath = decodePath(projectId ?? "");

  const { data: commands, isLoading } = useQuery({
    queryKey: ["commands", "project", projectPath],
    queryFn: () => api.getCommands("project", projectPath),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading commands...</div>
      </div>
    );
  }

  const commandList = commands ?? [];
  const folders = [...new Set(commandList.map((c) => c.folder))];

  return (
    <ResourceListPage
      scope="project"
      projectPath={projectPath}
      resourceType="command"
      typeLabel="Command"
      existingFolders={folders}
      subtitle={
        <p className="text-text-secondary">
          {commandList.length} command{commandList.length !== 1 ? "s" : ""} in {folders.length}{" "}
          folder{folders.length !== 1 ? "s" : ""} from{" "}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">.claude/commands/</code>
        </p>
      }
    >
      {folders.map((folder) => {
        const folderCommands = commandList.filter((c) => c.folder === folder);
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
                  to={`/projects/${projectId}/commands/${cmd.folder}/${cmd.name}`}
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

      {commandList.length === 0 && (
        <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
          No project-level commands found
        </div>
      )}
    </ResourceListPage>
  );
}
