import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { FolderOpen, Lock, Plus, Terminal } from "lucide-react";
import { useState } from "react";
import { CreateResourceDialog } from "@/components/config/CreateResourceDialog.js";
import { FileCard } from "@/components/files/FileCard.js";
import { FileList } from "@/components/files/FileList.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { useToast } from "@/components/ui/Toast.js";
import { listCommands } from "@/server/functions/commands.js";
import { createResource } from "@/server/functions/resource-mutations.js";

export const Route = createFileRoute("/global/commands/")({
  loader: async () => {
    const result = await listCommands({ data: { scope: "global" } });
    return result;
  },
  component: GlobalCommandsPage,
  pendingComponent: () => (
    <AppShell title="Global Commands">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading commands...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Global Commands">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load commands</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalCommandsPage() {
  const { folders, commands } = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (data: {
    name: string;
    folder?: string;
    frontmatter: Record<string, string>;
    body: string;
  }) => {
    setSaving(true);
    try {
      await createResource({
        data: {
          scope: "global",
          type: "command",
          name: data.name,
          folder: data.folder,
          frontmatter: {},
          body: data.body,
        },
      });
      toast("Command created successfully");
      setShowCreate(false);
      router.invalidate();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Global Commands">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Command
          </button>
        </div>

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
                    to="/global/commands/$folder/$commandName"
                    params={{ folder: cmd.folder, commandName: cmd.name }}
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
      </div>

      <CreateResourceDialog
        type="command"
        open={showCreate}
        saving={saving}
        existingFolders={folders}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
    </AppShell>
  );
}
