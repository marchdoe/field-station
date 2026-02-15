import React from 'react'
import { FileX } from 'lucide-react'

interface FileListProps {
  children: React.ReactNode
  emptyMessage?: string
}

export function FileList({
  children,
  emptyMessage = 'No files found.',
}: FileListProps) {
  const hasChildren = React.Children.count(children) > 0

  if (!hasChildren) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <FileX size={40} className="mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  )
}
