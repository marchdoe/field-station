# Phase 2: Resource File Editing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable creating, editing, and deleting user-owned agents, commands, and skills from the Field Station UI, with read-only protection for plugin-provided resources.

**Architecture:** New server mutation functions handle file CRUD with ownership checks. A `ResourceEditor` component provides frontmatter-aware editing (structured form fields + markdown body textarea). `CreateResourceDialog` enables creating new resources. The existing `FileCard` gains an editability indicator. All writes are guarded by `isUserOwned()`.

**Tech Stack:** TanStack Start (createServerFn), gray-matter (frontmatter serialization), Zod (validation), React 19, Tailwind CSS 4

---

### Task 1: Resource Writer Library

**Files:**
- Create: `src/server/lib/resource-writer.ts`
- Create: `src/server/lib/resource-writer.test.ts`
- Reference: `src/server/lib/ownership.ts`
- Reference: `src/server/lib/markdown-parser.ts`

**Context:** This follows the same pattern as `src/server/lib/config-writer.ts` — pure functions that handle file I/O, kept separate from `createServerFn` wrappers to avoid client bundling issues with `node:fs`.

**Step 1: Write the failing tests**

Create `src/server/lib/resource-writer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  resolveResourcePath,
  createResourceFile,
  updateResourceFile,
  deleteResourceFile,
  serializeMarkdown,
} from './resource-writer.js'

describe('serializeMarkdown', () => {
  it('serializes frontmatter + body', () => {
    const result = serializeMarkdown({ name: 'Test', description: 'A test' }, 'Hello world')
    expect(result).toContain('---')
    expect(result).toContain('name: Test')
    expect(result).toContain('description: A test')
    expect(result).toContain('Hello world')
  })

  it('returns body only when frontmatter is empty', () => {
    const result = serializeMarkdown({}, 'Just body')
    expect(result).toBe('Just body')
    expect(result).not.toContain('---')
  })
})

describe('resolveResourcePath', () => {
  it('resolves agent path', () => {
    const result = resolveResourcePath('/base', 'agent', 'my-agent')
    expect(result).toBe('/base/agents/my-agent.md')
  })

  it('resolves command path with folder', () => {
    const result = resolveResourcePath('/base', 'command', 'run', 'dev')
    expect(result).toBe('/base/commands/dev/run.md')
  })

  it('resolves skill path', () => {
    const result = resolveResourcePath('/base', 'skill', 'my-skill')
    expect(result).toBe('/base/skills/my-skill/SKILL.md')
  })
})

describe('createResourceFile', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-res-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('creates an agent markdown file with frontmatter', () => {
    const filePath = join(tmpDir, 'agents', 'test.md')
    createResourceFile(filePath, { name: 'Test Agent', description: 'Does things' }, 'Agent body')
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, 'utf-8')
    expect(content).toContain('name: Test Agent')
    expect(content).toContain('Agent body')
  })

  it('creates a command file without frontmatter', () => {
    const filePath = join(tmpDir, 'commands', 'dev', 'start.md')
    createResourceFile(filePath, {}, 'Run the dev server')
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, 'utf-8')
    expect(content).toBe('Run the dev server')
  })

  it('creates parent directories if needed', () => {
    const filePath = join(tmpDir, 'deep', 'nested', 'file.md')
    createResourceFile(filePath, {}, 'content')
    expect(existsSync(filePath)).toBe(true)
  })

  it('throws if file already exists', () => {
    const filePath = join(tmpDir, 'existing.md')
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(filePath, 'existing')
    expect(() => createResourceFile(filePath, {}, 'new')).toThrow('already exists')
  })

  it('throws if path is not user-owned', () => {
    const filePath = join(tmpDir, 'plugins', 'cache', 'test.md')
    expect(() => createResourceFile(filePath, {}, 'content')).toThrow('not user-owned')
  })
})

describe('updateResourceFile', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-res-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('overwrites an existing file', () => {
    const filePath = join(tmpDir, 'agent.md')
    writeFileSync(filePath, 'old content')
    updateResourceFile(filePath, { name: 'Updated' }, 'New body')
    const content = readFileSync(filePath, 'utf-8')
    expect(content).toContain('name: Updated')
    expect(content).toContain('New body')
  })

  it('writes body-only when frontmatter is empty', () => {
    const filePath = join(tmpDir, 'command.md')
    writeFileSync(filePath, 'old')
    updateResourceFile(filePath, {}, 'Updated command')
    const content = readFileSync(filePath, 'utf-8')
    expect(content).toBe('Updated command')
  })

  it('throws if file does not exist', () => {
    const filePath = join(tmpDir, 'missing.md')
    expect(() => updateResourceFile(filePath, {}, 'content')).toThrow('does not exist')
  })

  it('throws if path is not user-owned', () => {
    const filePath = join(tmpDir, 'plugins', 'cache', 'agent.md')
    mkdirSync(join(tmpDir, 'plugins', 'cache'), { recursive: true })
    writeFileSync(filePath, 'content')
    expect(() => updateResourceFile(filePath, {}, 'new')).toThrow('not user-owned')
  })
})

describe('deleteResourceFile', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-res-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('deletes an existing file', () => {
    const filePath = join(tmpDir, 'agent.md')
    writeFileSync(filePath, 'content')
    deleteResourceFile(filePath)
    expect(existsSync(filePath)).toBe(false)
  })

  it('throws if file does not exist', () => {
    const filePath = join(tmpDir, 'missing.md')
    expect(() => deleteResourceFile(filePath)).toThrow('does not exist')
  })

  it('throws if path is not user-owned', () => {
    const filePath = join(tmpDir, 'plugins', 'cache', 'agent.md')
    mkdirSync(join(tmpDir, 'plugins', 'cache'), { recursive: true })
    writeFileSync(filePath, 'content')
    expect(() => deleteResourceFile(filePath)).toThrow('not user-owned')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/lib/resource-writer.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/server/lib/resource-writer.ts`:

```typescript
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import matter from 'gray-matter'
import { isUserOwned } from './ownership.js'

export type ResourceType = 'agent' | 'command' | 'skill'

export function serializeMarkdown(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const keys = Object.keys(frontmatter).filter((k) => frontmatter[k] !== undefined && frontmatter[k] !== '')
  if (keys.length === 0) return body
  const cleaned: Record<string, unknown> = {}
  for (const k of keys) cleaned[k] = frontmatter[k]
  return matter.stringify(body, cleaned)
}

export function resolveResourcePath(
  baseDir: string,
  type: ResourceType,
  name: string,
  folder?: string,
): string {
  switch (type) {
    case 'agent':
      return join(baseDir, 'agents', `${name}.md`)
    case 'command':
      if (!folder) throw new Error('folder is required for commands')
      return join(baseDir, 'commands', folder, `${name}.md`)
    case 'skill':
      return join(baseDir, 'skills', name, 'SKILL.md')
  }
}

export function createResourceFile(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string,
): void {
  if (!isUserOwned(filePath)) {
    throw new Error(`Path is not user-owned: ${filePath}`)
  }
  if (existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}`)
  }
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, serializeMarkdown(frontmatter, body), 'utf-8')
}

export function updateResourceFile(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string,
): void {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`)
  }
  if (!isUserOwned(filePath)) {
    throw new Error(`Path is not user-owned: ${filePath}`)
  }
  writeFileSync(filePath, serializeMarkdown(frontmatter, body), 'utf-8')
}

export function deleteResourceFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`)
  }
  if (!isUserOwned(filePath)) {
    throw new Error(`Path is not user-owned: ${filePath}`)
  }
  unlinkSync(filePath)
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/lib/resource-writer.test.ts`
Expected: All 14 tests PASS

**Step 5: Commit**

```bash
git add src/server/lib/resource-writer.ts src/server/lib/resource-writer.test.ts
git commit -m "feat: add resource writer library with ownership guards"
```

---

### Task 2: Resource Mutation Server Functions

**Files:**
- Create: `src/server/functions/resource-mutations.ts`
- Reference: `src/server/lib/resource-writer.ts`
- Reference: `src/server/lib/claude-home.ts` (for `resolveClaudeHome`)
- Reference: `src/server/lib/validation.ts` (for existing patterns)

**Context:** Following the same pattern as `src/server/functions/config-mutations.ts` — only `createServerFn` exports in this file. All pure logic lives in `src/server/lib/resource-writer.ts` to avoid pulling `node:fs` into the client bundle.

**Step 1: Write the implementation**

Create `src/server/functions/resource-mutations.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { join } from 'node:path'
import { resolveClaudeHome } from '../lib/claude-home.js'
import {
  resolveResourcePath,
  createResourceFile,
  updateResourceFile,
  deleteResourceFile,
} from '../lib/resource-writer.js'

const resourceTypeSchema = z.enum(['agent', 'command', 'skill'])

const createResourceInput = z.object({
  scope: z.enum(['global', 'project']),
  type: resourceTypeSchema,
  name: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric with hyphens/underscores'),
  folder: z.string().optional(),
  projectPath: z.string().optional(),
  frontmatter: z.record(z.unknown()).default({}),
  body: z.string().default(''),
})

export const createResource = createServerFn({ method: 'POST' })
  .inputValidator(createResourceInput)
  .handler(async ({ data }) => {
    const baseDir = data.scope === 'global'
      ? resolveClaudeHome()
      : join(data.projectPath!, '.claude')
    const filePath = resolveResourcePath(baseDir, data.type, data.name, data.folder)
    createResourceFile(filePath, data.frontmatter, data.body)
    return { success: true, filePath }
  })

const updateResourceInput = z.object({
  filePath: z.string().min(1),
  frontmatter: z.record(z.unknown()).default({}),
  body: z.string().default(''),
})

export const updateResource = createServerFn({ method: 'POST' })
  .inputValidator(updateResourceInput)
  .handler(async ({ data }) => {
    updateResourceFile(data.filePath, data.frontmatter, data.body)
    return { success: true }
  })

const deleteResourceInput = z.object({
  filePath: z.string().min(1),
})

export const deleteResource = createServerFn({ method: 'POST' })
  .inputValidator(deleteResourceInput)
  .handler(async ({ data }) => {
    deleteResourceFile(data.filePath)
    return { success: true }
  })
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/server/functions/resource-mutations.ts
git commit -m "feat: add resource mutation server functions"
```

---

### Task 3: Add `isEditable` Flag to Resource Types & Server Functions

**Files:**
- Modify: `src/types/config.ts` — add `isEditable` to `AgentFile`, `CommandFile`, `SkillFile`, `AgentDetail`, `CommandDetail`, `SkillDetail`
- Modify: `src/server/functions/agents.ts` — compute `isEditable` using `isUserOwned(filePath)`
- Modify: `src/server/functions/commands.ts` — same
- Modify: `src/server/functions/skills.ts` — same

**Context:** The frontend needs to know whether each resource can be edited or deleted. We compute this server-side using the existing `isUserOwned()` function rather than leaking path-checking logic to the client.

**Step 1: Add `isEditable` to types**

In `src/types/config.ts`, add `isEditable: boolean` to all six interfaces:

```typescript
// In AgentFile:
isEditable: boolean

// In AgentDetail:
isEditable: boolean

// In CommandFile:
isEditable: boolean

// In CommandDetail:
isEditable: boolean

// In SkillFile:
isEditable: boolean

// In SkillDetail:
isEditable: boolean
```

**Step 2: Add `isEditable` to agent server functions**

In `src/server/functions/agents.ts`:

1. Add import: `import { isUserOwned } from '../lib/ownership.js'`
2. In `readAgentsFromDir` (the internal function that builds `AgentFile` objects), add:
   ```typescript
   isEditable: isUserOwned(filePath),
   ```
3. In the `getAgent` handler that returns `AgentDetail`, add:
   ```typescript
   isEditable: isUserOwned(filePath),
   ```

**Step 3: Add `isEditable` to command server functions**

In `src/server/functions/commands.ts`:

1. Add import: `import { isUserOwned } from '../lib/ownership.js'`
2. In the loop that builds `CommandFile` objects, add:
   ```typescript
   isEditable: isUserOwned(filePath),
   ```
3. In the `getCommand` handler that returns `CommandDetail`, add:
   ```typescript
   isEditable: isUserOwned(filePath),
   ```

**Step 4: Add `isEditable` to skill server functions**

In `src/server/functions/skills.ts`:

1. Add import: `import { isUserOwned } from '../lib/ownership.js'`
2. In `readSkillsFromDir` (the internal function that builds `SkillFile` objects), add:
   ```typescript
   isEditable: isUserOwned(filePath),
   ```
3. In the `getSkill` handler that returns `SkillDetail`, add:
   ```typescript
   isEditable: isUserOwned(filePath),
   ```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/types/config.ts src/server/functions/agents.ts src/server/functions/commands.ts src/server/functions/skills.ts
git commit -m "feat: add isEditable flag to resource types and server functions"
```

---

### Task 4: ResourceEditor Component

**Files:**
- Create: `src/components/config/ResourceEditor.tsx`
- Reference: `src/components/ui/Toast.tsx` (for feedback pattern)
- Reference: `src/components/config/AddSettingForm.tsx` (for form pattern)

**Context:** This component replaces the read-only `MarkdownViewer` when the user clicks "Edit" on a detail page. It shows structured form fields for frontmatter (agent: name, description, tools, color; skill: name, description, allowed-tools) and a textarea for the markdown body. Commands have no frontmatter — just the body textarea.

**Step 1: Write the component**

Create `src/components/config/ResourceEditor.tsx`:

```tsx
import { useState } from 'react'
import { Save, X } from 'lucide-react'

type ResourceType = 'agent' | 'command' | 'skill'

interface FrontmatterField {
  key: string
  label: string
  required?: boolean
}

const FRONTMATTER_FIELDS: Record<ResourceType, FrontmatterField[]> = {
  agent: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'tools', label: 'Tools' },
    { key: 'color', label: 'Color' },
  ],
  command: [],
  skill: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'allowed-tools', label: 'Allowed Tools' },
  ],
}

interface ResourceEditorProps {
  type: ResourceType
  frontmatter: Record<string, string>
  body: string
  saving?: boolean
  onSave: (frontmatter: Record<string, string>, body: string) => void
  onCancel: () => void
}

export function ResourceEditor({
  type,
  frontmatter: initialFrontmatter,
  body: initialBody,
  saving,
  onSave,
  onCancel,
}: ResourceEditorProps) {
  const fields = FRONTMATTER_FIELDS[type]
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({ ...initialFrontmatter })
  const [body, setBody] = useState(initialBody)

  const updateField = (key: string, value: string) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(frontmatter, body)
  }

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border-default bg-surface-1 p-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Frontmatter
          </h3>
          {fields.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`field-${field.key}`}
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                {field.label}
                {field.required && <span className="text-danger ml-1">*</span>}
              </label>
              <input
                id={`field-${field.key}`}
                type="text"
                value={frontmatter[field.key] ?? ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="resource-body"
          className="block text-sm font-semibold text-text-secondary uppercase tracking-wide"
        >
          Content
        </label>
        <textarea
          id="resource-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="w-full rounded-xl border border-border-default bg-surface-0 px-4 py-3 text-sm text-text-primary font-mono focus:border-accent focus:outline-none resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/config/ResourceEditor.tsx
git commit -m "feat: add ResourceEditor component with frontmatter-aware editing"
```

---

### Task 5: CreateResourceDialog Component

**Files:**
- Create: `src/components/config/CreateResourceDialog.tsx`
- Reference: `src/components/ui/ConfirmDialog.tsx` (for dialog pattern using native `<dialog>`)
- Reference: `src/components/config/ResourceEditor.tsx` (for frontmatter field config)

**Context:** A dialog that appears when clicking "New Agent/Command/Skill" on list pages. It collects the resource name (becomes the filename), optional frontmatter fields, and body content. For commands, it also collects a folder name.

**Step 1: Write the component**

Create `src/components/config/CreateResourceDialog.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

type ResourceType = 'agent' | 'command' | 'skill'

interface FrontmatterField {
  key: string
  label: string
  required?: boolean
}

const FRONTMATTER_FIELDS: Record<ResourceType, FrontmatterField[]> = {
  agent: [
    { key: 'description', label: 'Description' },
    { key: 'tools', label: 'Tools' },
  ],
  command: [],
  skill: [
    { key: 'description', label: 'Description' },
    { key: 'allowed-tools', label: 'Allowed Tools' },
  ],
}

const TYPE_LABELS: Record<ResourceType, string> = {
  agent: 'Agent',
  command: 'Command',
  skill: 'Skill',
}

interface CreateResourceDialogProps {
  type: ResourceType
  open: boolean
  saving?: boolean
  existingFolders?: string[]
  onCreate: (data: {
    name: string
    folder?: string
    frontmatter: Record<string, string>
    body: string
  }) => void
  onClose: () => void
}

export function CreateResourceDialog({
  type,
  open,
  saving,
  existingFolders,
  onCreate,
  onClose,
}: CreateResourceDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [folder, setFolder] = useState('')
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({})
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  const reset = () => {
    setName('')
    setFolder('')
    setFrontmatter({})
    setBody('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
      setError('Name must contain only letters, numbers, hyphens, and underscores')
      return
    }
    if (type === 'command' && !folder.trim()) {
      setError('Folder is required for commands')
      return
    }
    setError('')

    const fm: Record<string, string> = { ...frontmatter }
    if (type !== 'command') {
      fm.name = name.trim()
    }

    onCreate({
      name: name.trim(),
      folder: type === 'command' ? folder.trim() : undefined,
      frontmatter: fm,
      body,
    })
  }

  const fields = FRONTMATTER_FIELDS[type]

  return (
    <dialog
      ref={ref}
      onCancel={handleClose}
      className="backdrop:bg-black/50 bg-surface-1 rounded-xl border border-border-default p-0 w-full max-w-lg shadow-xl"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            New {TYPE_LABELS[type]}
          </h2>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label htmlFor="resource-name" className="block text-sm font-medium text-text-secondary mb-1">
            Name <span className="text-danger">*</span>
          </label>
          <input
            id="resource-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-resource"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-text-muted mt-1">Used as filename ({name || 'name'}.md)</p>
        </div>

        {type === 'command' && (
          <div>
            <label htmlFor="resource-folder" className="block text-sm font-medium text-text-secondary mb-1">
              Folder <span className="text-danger">*</span>
            </label>
            {existingFolders && existingFolders.length > 0 ? (
              <div className="space-y-2">
                <select
                  id="resource-folder"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="">Select or type a folder...</option>
                  {existingFolders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Or enter a new folder name"
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
            ) : (
              <input
                id="resource-folder"
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="folder-name"
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            )}
          </div>
        )}

        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`create-${field.key}`}
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {field.label}
            </label>
            <input
              id={`create-${field.key}`}
              type="text"
              value={frontmatter[field.key] ?? ''}
              onChange={(e) => setFrontmatter((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label htmlFor="create-body" className="block text-sm font-medium text-text-secondary mb-1">
            Content
          </label>
          <textarea
            id="create-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={`Write your ${TYPE_LABELS[type].toLowerCase()} content here...`}
            className="w-full rounded-xl border border-border-default bg-surface-0 px-4 py-3 text-sm text-text-primary font-mono focus:border-accent focus:outline-none resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg border border-border-default bg-surface-1 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Creating...' : `Create ${TYPE_LABELS[type]}`}
          </button>
        </div>
      </div>
    </dialog>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/config/CreateResourceDialog.tsx
git commit -m "feat: add CreateResourceDialog component"
```

---

### Task 6: Wire Up Agent Pages

**Files:**
- Modify: `src/routes/global/agents/index.tsx` — add "New Agent" button
- Modify: `src/routes/global/agents/$agentName.tsx` — add Edit/Delete for user-owned agents
- Modify: `src/routes/projects/$projectId/agents/index.tsx` — add "New Agent" button
- Modify: `src/routes/projects/$projectId/agents/$agentName.tsx` — add Edit/Delete
- Reference: `src/components/config/ResourceEditor.tsx`
- Reference: `src/components/config/CreateResourceDialog.tsx`
- Reference: `src/components/ui/ConfirmDialog.tsx`
- Reference: `src/components/ui/Toast.tsx`
- Reference: `src/server/functions/resource-mutations.ts`

**Context:** Each detail page needs: (1) an "Edit" button that toggles between `MarkdownViewer` and `ResourceEditor`, (2) a "Delete" button with `ConfirmDialog`, (3) toast feedback. Each list page needs: (4) a "New Agent" button that opens `CreateResourceDialog`. Read-only resources show a lock icon instead of edit/delete.

**Step 1: Update the global agent detail page**

In `src/routes/global/agents/$agentName.tsx`:

1. Add imports for `useState`, `useRouter`, `ResourceEditor`, `ConfirmDialog`, `useToast`, `updateResource`, `deleteResource`, `Pencil`, `Trash2`, `Lock`.
2. Add `isEditable` from the loader data (already available via `AgentDetail`).
3. Add state: `editing`, `saving`, `confirmDelete`.
4. When `!editing && isEditable`: show "Edit" and "Delete" buttons in the header.
5. When `!isEditable`: show a lock icon badge.
6. When `editing`: render `ResourceEditor` instead of `ViewToggle` + `MarkdownViewer`/`CodeViewer`.
7. On save: call `updateResource({ data: { filePath, frontmatter, body } })`, show toast, set `editing = false`, `router.invalidate()`.
8. On delete confirm: call `deleteResource({ data: { filePath } })`, show toast, navigate back to list.

**Step 2: Update the project agent detail page**

Same pattern as global, in `src/routes/projects/$projectId/agents/$agentName.tsx`. The only difference is the back-link URL includes `projectId`.

**Step 3: Update the global agent list page**

In `src/routes/global/agents/index.tsx`:

1. Add imports for `useState`, `useRouter`, `CreateResourceDialog`, `useToast`, `createResource`, `Plus`.
2. Add state: `showCreate`, `saving`.
3. Add a "New Agent" button next to the page heading.
4. Render `CreateResourceDialog` with `type="agent"` and `scope="global"`.
5. On create: call `createResource(...)`, show toast, `router.invalidate()`, close dialog.
6. Add `isEditable` indicator on `FileCard` — if `!agent.isEditable`, show a small lock icon.

**Step 4: Update the project agent list page**

Same pattern as global, in `src/routes/projects/$projectId/agents/index.tsx`, passing `scope="project"` and `projectPath`.

**Step 5: Verify TypeScript compiles and test manually**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/routes/global/agents/ src/routes/projects/\$projectId/agents/
git commit -m "feat: wire up agent editing, creation, and deletion"
```

---

### Task 7: Wire Up Command Pages

**Files:**
- Modify: `src/routes/global/commands/index.tsx` — add "New Command" button
- Modify: `src/routes/global/commands/$folder.$commandName.tsx` — add Edit/Delete
- Modify: `src/routes/projects/$projectId/commands/index.tsx` — add "New Command" button
- Modify: `src/routes/projects/$projectId/commands/$folder.$commandName.tsx` — add Edit/Delete

**Context:** Same pattern as Task 6 but for commands. Key differences: commands have no frontmatter (only body), and creation requires a `folder` parameter. The list page loader already returns `folders` — pass these to `CreateResourceDialog` as `existingFolders`.

**Step 1: Update the global command detail page**

In `src/routes/global/commands/$folder.$commandName.tsx`:

1. Same editing/delete pattern as agents.
2. `ResourceEditor` type is `"command"` — no frontmatter fields, just body textarea.
3. On save: pass empty `frontmatter: {}` and the body.

**Step 2: Update the project command detail page**

Same pattern in `src/routes/projects/$projectId/commands/$folder.$commandName.tsx`.

**Step 3: Update the global command list page**

In `src/routes/global/commands/index.tsx`:

1. Add "New Command" button and `CreateResourceDialog` with `type="command"`.
2. Pass `existingFolders={data.folders}` so the user can select an existing folder or type a new one.

**Step 4: Update the project command list page**

Same pattern in `src/routes/projects/$projectId/commands/index.tsx`.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/routes/global/commands/ src/routes/projects/\$projectId/commands/
git commit -m "feat: wire up command editing, creation, and deletion"
```

---

### Task 8: Wire Up Skill Pages

**Files:**
- Modify: `src/routes/global/skills/index.tsx` — add "New Skill" button
- Modify: `src/routes/global/skills/$skillName.tsx` — add Edit/Delete
- Modify: `src/routes/projects/$projectId/skills/index.tsx` — add "New Skill" button
- Modify: `src/routes/projects/$projectId/skills/$skillName.tsx` — add Edit/Delete

**Context:** Same pattern as Task 6 but for skills. Key differences: skills use `folderName` as the identifier, the file is always `SKILL.md` inside the skill folder, and frontmatter fields are `name`, `description`, `allowed-tools`.

**Step 1: Update the global skill detail page**

In `src/routes/global/skills/$skillName.tsx`:

1. Same editing/delete pattern as agents.
2. `ResourceEditor` type is `"skill"`.
3. Frontmatter fields: `name`, `description`, `allowed-tools`.

**Step 2: Update the project skill detail page**

Same pattern in `src/routes/projects/$projectId/skills/$skillName.tsx`.

**Step 3: Update the global skill list page**

In `src/routes/global/skills/index.tsx`:

1. Add "New Skill" button and `CreateResourceDialog` with `type="skill"`.

**Step 4: Update the project skill list page**

Same pattern in `src/routes/projects/$projectId/skills/index.tsx`.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/routes/global/skills/ src/routes/projects/\$projectId/skills/
git commit -m "feat: wire up skill editing, creation, and deletion"
```

---

### Task 9: End-to-End Verification

**Files:**
- All files created/modified in Tasks 1-8

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (resource-writer tests + existing config-writer tests + json-path tests + ownership tests)

**Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Dev server check**

Run: `npm run dev` (if not already running)
Navigate to `http://localhost:3456`

**Step 4: Manual verification checklist**

- [ ] Navigate to Global > Agents — "New Agent" button visible
- [ ] Click "New Agent" — dialog opens with name, description, tools fields + body textarea
- [ ] Create a test agent — toast shows success, new agent appears in list
- [ ] Click into the test agent — Edit and Delete buttons visible
- [ ] Click Edit — ResourceEditor appears with frontmatter fields and body
- [ ] Modify description and body, click Save — toast shows success, content updated
- [ ] Click Delete — ConfirmDialog appears, confirm — toast shows success, redirected to list
- [ ] Navigate to Global > Commands — "New Command" button visible
- [ ] Create a test command with a folder — command appears in list
- [ ] Edit and delete the test command — works correctly
- [ ] Navigate to Global > Skills — "New Skill" button visible
- [ ] Create, edit, delete a test skill — all work correctly
- [ ] If any plugin-provided agents/commands/skills exist — verify they show lock icon, no edit/delete buttons
- [ ] Repeat spot-checks for a Project scope

**Step 5: Commit any fixes**

If any issues found, fix and commit individually.

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: phase 2 verification complete"
```
