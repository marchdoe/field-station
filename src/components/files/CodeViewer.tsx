import { useState, useEffect } from 'react'
import { codeToHtml } from 'shiki'
import { cn } from '@/lib/utils'

interface CodeViewerProps {
  code: string
  language: string
  className?: string
}

export function CodeViewer({ code, language, className }: CodeViewerProps) {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    codeToHtml(code, {
      lang: language,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    }).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => {
      cancelled = true
    }
  }, [code, language])

  if (!html) {
    return (
      <pre
        className={cn(
          'overflow-x-auto rounded-lg bg-surface-2 p-4 text-sm font-mono text-text-secondary',
          className,
        )}
      >
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <div
      className={cn(
        'shiki-wrapper overflow-x-auto rounded-lg text-sm [&_pre]:p-4 [&_pre]:m-0',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
