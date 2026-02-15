import { cn, getPluginDisplayName, getPluginSource, formatDate } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

interface PluginCardProps {
  id: string
  enabled: boolean
  version: string
  installedAt: string
  lastUpdated: string
  homepage?: string
  repository?: string
}

export function PluginCard({
  id,
  enabled,
  version,
  installedAt,
  lastUpdated,
  homepage,
  repository,
}: PluginCardProps) {
  const displayName = getPluginDisplayName(id)
  const source = getPluginSource(id)
  const link = homepage || repository

  return (
    <div
      className={cn(
        'rounded-xl border border-border-default bg-surface-1 p-4',
        enabled
          ? 'border-l-4 border-l-success'
          : 'border-l-4 border-l-border-muted opacity-80',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {enabled && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            )}
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 min-w-0"
              >
                <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                  {displayName}
                </h3>
                <ExternalLink size={12} className="shrink-0 text-text-muted group-hover:text-accent transition-colors" />
              </a>
            ) : (
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {displayName}
              </h3>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-muted truncate">{source}</p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
            enabled
              ? 'bg-badge-success-bg text-badge-success-text'
              : 'bg-badge-danger-bg text-badge-danger-text',
          )}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div className="space-y-1 text-xs text-text-secondary">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Version</span>
          <code className="rounded-md bg-accent/15 text-accent px-1.5 py-0.5 font-mono text-xs">
            {version}
          </code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Installed</span>
          <span>{formatDate(installedAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Updated</span>
          <span>{formatDate(lastUpdated)}</span>
        </div>
      </div>
    </div>
  )
}
