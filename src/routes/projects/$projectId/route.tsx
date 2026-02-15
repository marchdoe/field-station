import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getProjectSummary } from '@/server/functions/projects.js'
import { AppShell } from '@/components/layout/AppShell.js'
import { ProjectTabs } from '@/components/layout/ProjectTabs.js'
import { decodePath, getProjectName } from '@/lib/utils.js'

export const Route = createFileRoute('/projects/$projectId')({
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId)
    const summary = await getProjectSummary({ data: { projectPath } })
    return { summary, projectId: params.projectId }
  },
  component: ProjectLayout,
  pendingComponent: () => (
    <AppShell title="Project">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading project...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Project">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load project</p>
        <p className="text-text-muted text-sm mt-1">
          {(error as Error).message}
        </p>
      </div>
    </AppShell>
  ),
})

function ProjectLayout() {
  const { summary, projectId } = Route.useLoaderData()
  const name = getProjectName(summary.path)

  return (
    <AppShell title={name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{name}</h1>
          <p className="text-text-secondary mt-1">{summary.path}</p>
        </div>
        <ProjectTabs projectId={projectId} summary={summary} />
        <Outlet />
      </div>
    </AppShell>
  )
}
