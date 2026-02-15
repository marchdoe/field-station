import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/lib/utils'
import type { Components } from 'react-markdown'

interface MarkdownViewerProps {
  content: string
  className?: string
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 first:mt-0 text-2xl font-bold text-text-primary border-b border-border-muted pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 first:mt-0 text-xl font-semibold text-text-primary border-b border-border-muted pb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 first:mt-0 text-lg font-semibold text-text-primary">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 first:mt-0 text-base font-semibold text-text-primary">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-text-secondary">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent hover:text-accent-hover underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 text-text-secondary marker:text-text-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 text-text-secondary marker:text-text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-3 border-accent/40 pl-4 text-text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code className="text-[13px] leading-relaxed">{children}</code>
      )
    }
    return (
      <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-text-primary">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-surface-2 p-4">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border-default">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border-muted px-3 py-2 text-text-secondary">
      {children}
    </td>
  ),
  hr: () => <hr className="my-6 border-border-muted" />,
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ''}
      className="my-3 max-w-full rounded-lg"
    />
  ),
  input: ({ checked, disabled, ...props }) => (
    <input
      {...props}
      checked={checked}
      disabled={disabled}
      type="checkbox"
      className="mr-2 accent-accent"
    />
  ),
}

export function MarkdownViewer({
  content,
  className,
}: MarkdownViewerProps) {
  return (
    <div className={cn('text-sm', className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </Markdown>
    </div>
  )
}
