import { cn } from '@/lib/utils'
import ThemeToggle from './ThemeToggle'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-border-default bg-surface-1 px-6',
      )}
    >
      <nav className="flex items-center gap-2 text-sm">
        <span className="font-medium text-text-primary">Field Station</span>
        {title && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary">{title}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
