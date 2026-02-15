import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Terminal, FolderOpen, Plus, Lock } from 'lucide-react'
import { listCommands } from '@/server/functions/commands.js'
import { createResource } from '@/server/functions/resource-mutations.js'
import { FileCard } from '@/components/files/FileCard.js'
import { FileList } from '@/components/files/FileList.js'
import { CreateResourceDialog } from '@/components/config/CreateResourceDialog.js'
import { useToast } from '@/components/ui/Toast.js'
import { decodePath } from '@/lib/utils.js'

export const Route = createFileRoute('/projects/$projectId/commands/')({
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId)
    const result = await listCommands({
      data: { scope: 'project', projectPath },
    })
    return { ...result, projectId: params.projectId, projectPath }
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
})

function ProjectCommandsPage() {
  const { folders, commands, projectId, projectPath } = Route.useLoaderData()
  const router = useRouter()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleCreate = async (data: {
    name: string
    folder?: string
    frontmatter: Record<string, string>
    body: string
  }) => {
    setSaving(true)
    try {
      await createResource({
        data: {
          scope: 'project',
          type: 'command',
          name: data.name,
          folder: data.folder,
          projectPath,
          frontmatter: {},
          body: data.body,
        },
      })
      toast('Command created successfully')
      setShowCreate(false)
      router.invalidate()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-text-secondary">
          {commands.length} command{commands.length !== 1 ? 's' : ''} in{' '}
          {folders.length} folder{folders.length !== 1 ? 's' : ''} from{' '}
          <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">
            .claude/commands/
          </code>
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Command
        </button>
      </div>

      {folders.map((folder) => {
        const folderCommands = commands.filter((c) => c.folder === folder)
        return (
          <div key={folder}>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">
                {folder}/
              </h2>
              <span className="text-sm text-text-muted">
                ({folderCommands.length} commands)
              </span>
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
        )
      })}

      {commands.length === 0 && (
        <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
          No project-level commands found
        </div>
      )}

      <CreateResourceDialog
        type="command"
        open={showCreate}
        saving={saving}
        existingFolders={folders}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
