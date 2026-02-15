import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Zap, Plus, Lock } from 'lucide-react'
import { listSkills } from '@/server/functions/skills.js'
import { createResource } from '@/server/functions/resource-mutations.js'
import { AppShell } from '@/components/layout/AppShell.js'
import { FileCard } from '@/components/files/FileCard.js'
import { FileList } from '@/components/files/FileList.js'
import { CreateResourceDialog } from '@/components/config/CreateResourceDialog.js'
import { useToast } from '@/components/ui/Toast.js'

export const Route = createFileRoute('/global/skills/')({
  loader: async () => {
    const skills = await listSkills({ data: { scope: 'global' } })
    return { skills }
  },
  component: GlobalSkillsPage,
  pendingComponent: () => (
    <AppShell title="Global Skills">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading skills...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Global Skills">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load skills</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
})

function GlobalSkillsPage() {
  const { skills } = Route.useLoaderData()
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
          scope: 'global',
          type: 'skill',
          name: data.name,
          frontmatter: data.frontmatter,
          body: data.body,
        },
      })
      toast('Skill created successfully')
      setShowCreate(false)
      router.invalidate()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Global Skills">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Global Skills</h1>
            <p className="text-text-secondary mt-1">
              {skills.length} skill{skills.length !== 1 ? 's' : ''} from{' '}
              <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">~/.claude/skills/</code>
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Skill
          </button>
        </div>

        <FileList emptyMessage="No skills found">
          {skills.map((skill) => (
            <Link
              key={skill.folderName}
              to="/global/skills/$skillName"
              params={{ skillName: skill.folderName }}
              className="block"
            >
              <FileCard
                name={skill.name}
                description={skill.description}
                fileName={`${skill.folderName}/SKILL.md`}
                variant="skill"
                meta={{
                  ...(skill.allowedTools ? { 'allowed-tools': skill.allowedTools } : {}),
                  ...(!skill.isEditable ? { source: 'plugin' } : {}),
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
      </div>

      <CreateResourceDialog
        type="skill"
        open={showCreate}
        saving={saving}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
    </AppShell>
  )
}
