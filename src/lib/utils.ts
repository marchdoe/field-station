import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function decodePath(encoded: string): string {
  const withoutLeadingDash = encoded.startsWith('-') ? encoded.slice(1) : encoded
  return '/' + withoutLeadingDash.replace(/-/g, '/')
}

export function encodePath(path: string): string {
  return '-' + path.slice(1).replace(/\//g, '-')
}

export function getProjectName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

export function getPluginDisplayName(id: string): string {
  const name = id.split('@')[0] ?? id
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function getPluginSource(id: string): string {
  return id.split('@')[1] ?? 'unknown'
}
