# Phase 1: Core Settings Editing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to add, edit, delete, and move JSON settings across all 4 config layers (global, global-local, project, project-local) with confirmation dialogs for destructive operations.

**Architecture:** New server mutation functions (POST) mirror the existing GET read paths, doing atomic read-modify-write on settings JSON files. Frontend extends the existing `SettingsViewer` with inline editing, action buttons, and an "Add Setting" form. A reusable `ConfirmDialog` and toast notification system provide safety and feedback.

**Tech Stack:** TanStack Start server functions, Zod validation, React state, Tailwind CSS, Vitest

---

### Task 1: Vitest Configuration

No test config exists yet. Set up Vitest for server-side unit tests.

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add test configuration to vite.config.ts**

Add a `test` block to the existing Vite config:

```ts
const config = defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3456,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  plugins: [
    // ... existing plugins unchanged
  ],
})
```

**Step 2: Verify test runner works**

Run: `npx vitest run`
Expected: "No test files found" (0 tests, no failures)

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: configure vitest for server-side tests"
```

---

### Task 2: Ownership Guard (`src/server/lib/ownership.ts`)

Path-based ownership check that prevents writes to plugin-managed files.

**Files:**
- Create: `src/server/lib/ownership.ts`
- Create: `src/server/lib/ownership.test.ts`

**Step 1: Write the failing tests**

```ts
// src/server/lib/ownership.test.ts
import { describe, it, expect } from 'vitest'
import { isUserOwned } from './ownership.js'

describe('isUserOwned', () => {
  it('returns true for global agents directory', () => {
    expect(isUserOwned('/Users/me/.claude/agents/my-agent.md')).toBe(true)
  })

  it('returns true for global settings.json', () => {
    expect(isUserOwned('/Users/me/.claude/settings.json')).toBe(true)
  })

  it('returns true for project .claude directory', () => {
    expect(isUserOwned('/Users/me/project/.claude/settings.json')).toBe(true)
  })

  it('returns false for plugin cache paths', () => {
    expect(
      isUserOwned('/Users/me/.claude/plugins/cache/some-plugin/agents/foo.md'),
    ).toBe(false)
  })

  it('returns false for nested plugin cache paths', () => {
    expect(
      isUserOwned('/Users/me/.claude/plugins/cache/org/plugin/skills/bar/SKILL.md'),
    ).toBe(false)
  })

  it('returns true for plugins directory outside cache', () => {
    expect(isUserOwned('/Users/me/.claude/plugins/installed_plugins.json')).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/lib/ownership.test.ts`
Expected: FAIL — cannot find module `./ownership.js`

**Step 3: Write minimal implementation**

```ts
// src/server/lib/ownership.ts
const PROTECTED_PATH_SEGMENTS = ['/plugins/cache/']

export function isUserOwned(filePath: string): boolean {
  return !PROTECTED_PATH_SEGMENTS.some((segment) => filePath.includes(segment))
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/lib/ownership.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/server/lib/ownership.ts src/server/lib/ownership.test.ts
git commit -m "feat: add ownership guard for plugin-managed files"
```

---

### Task 3: JSON Dot-Path Utilities (`src/server/lib/json-path.ts`)

Utility functions for getting, setting, and deleting values at dot-separated key paths in JSON objects (e.g., `"hooks.PreToolUse"` or `"permissions.allow"`).

**Files:**
- Create: `src/server/lib/json-path.ts`
- Create: `src/server/lib/json-path.test.ts`

**Step 1: Write the failing tests**

```ts
// src/server/lib/json-path.test.ts
import { describe, it, expect } from 'vitest'
import { getAtPath, setAtPath, deleteAtPath } from './json-path.js'
import type { JsonObject } from '@/types/config.js'

describe('getAtPath', () => {
  it('gets top-level value', () => {
    expect(getAtPath({ foo: 'bar' }, 'foo')).toBe('bar')
  })

  it('gets nested value', () => {
    expect(getAtPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('returns undefined for missing path', () => {
    expect(getAtPath({ a: 1 }, 'b')).toBeUndefined()
  })
})

describe('setAtPath', () => {
  it('sets top-level value', () => {
    const obj: JsonObject = { foo: 'old' }
    const result = setAtPath(obj, 'foo', 'new')
    expect(result.foo).toBe('new')
  })

  it('sets nested value creating intermediates', () => {
    const obj: JsonObject = {}
    const result = setAtPath(obj, 'a.b.c', true)
    expect(result).toEqual({ a: { b: { c: true } } })
  })

  it('does not mutate original object', () => {
    const obj: JsonObject = { foo: 'bar' }
    setAtPath(obj, 'foo', 'baz')
    expect(obj.foo).toBe('bar')
  })

  it('preserves sibling keys', () => {
    const obj: JsonObject = { a: 1, b: 2 }
    const result = setAtPath(obj, 'a', 99)
    expect(result).toEqual({ a: 99, b: 2 })
  })
})

describe('deleteAtPath', () => {
  it('deletes top-level key', () => {
    const obj: JsonObject = { a: 1, b: 2 }
    const result = deleteAtPath(obj, 'a')
    expect(result).toEqual({ b: 2 })
  })

  it('deletes nested key', () => {
    const obj: JsonObject = { a: { b: 1, c: 2 } }
    const result = deleteAtPath(obj, 'a.b')
    expect(result).toEqual({ a: { c: 2 } })
  })

  it('does not mutate original object', () => {
    const obj: JsonObject = { a: 1 }
    deleteAtPath(obj, 'a')
    expect(obj.a).toBe(1)
  })

  it('returns unchanged object for missing path', () => {
    const obj: JsonObject = { a: 1 }
    const result = deleteAtPath(obj, 'b')
    expect(result).toEqual({ a: 1 })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/lib/json-path.test.ts`
Expected: FAIL — cannot find module `./json-path.js`

**Step 3: Write minimal implementation**

```ts
// src/server/lib/json-path.ts
import type { JsonObject, JsonValue } from '@/types/config.js'

export function getAtPath(obj: JsonObject, path: string): JsonValue | undefined {
  const keys = path.split('.')
  let current: JsonValue | undefined = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }
    current = (current as JsonObject)[key]
  }
  return current
}

export function setAtPath(obj: JsonObject, path: string, value: JsonValue): JsonObject {
  const keys = path.split('.')
  if (keys.length === 1) {
    return { ...obj, [keys[0]!]: value }
  }

  const [first, ...rest] = keys
  const child = obj[first!]
  const childObj: JsonObject =
    child !== null && child !== undefined && typeof child === 'object' && !Array.isArray(child)
      ? (child as JsonObject)
      : {}

  return { ...obj, [first!]: setAtPath(childObj, rest.join('.'), value) }
}

export function deleteAtPath(obj: JsonObject, path: string): JsonObject {
  const keys = path.split('.')
  if (keys.length === 1) {
    const { [keys[0]!]: _, ...rest } = obj
    return rest
  }

  const [first, ...remaining] = keys
  const child = obj[first!]
  if (child === null || child === undefined || typeof child !== 'object' || Array.isArray(child)) {
    return { ...obj }
  }

  return { ...obj, [first!]: deleteAtPath(child as JsonObject, remaining.join('.')) }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/lib/json-path.test.ts`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add src/server/lib/json-path.ts src/server/lib/json-path.test.ts
git commit -m "feat: add JSON dot-path get/set/delete utilities"
```

---

### Task 4: Config Mutations Server Functions (`src/server/functions/config-mutations.ts`)

The core write-side API. Each function reads a settings JSON file, applies a change, and writes it back.

**Files:**
- Create: `src/server/functions/config-mutations.ts`
- Create: `src/server/functions/config-mutations.test.ts`
- Reference: `src/server/lib/claude-home.ts` (for `resolveClaudeHome`)
- Reference: `src/server/lib/config-parser.ts` (for `readJsonFile` pattern)

**Step 1: Write the failing tests**

These tests use a temp directory to avoid touching real config files.

```ts
// src/server/functions/config-mutations.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readJsonFileSafe,
  writeJsonFileSafe,
  resolveLayerPath,
  applyUpdateSetting,
  applyDeleteSetting,
  applyMoveSetting,
} from './config-mutations.js'

describe('readJsonFileSafe', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('reads valid JSON file', () => {
    const file = join(tmpDir, 'test.json')
    writeFileSync(file, '{"a":1}')
    expect(readJsonFileSafe(file)).toEqual({ a: 1 })
  })

  it('returns empty object for missing file', () => {
    expect(readJsonFileSafe(join(tmpDir, 'missing.json'))).toEqual({})
  })
})

describe('writeJsonFileSafe', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('writes JSON with 2-space indent and trailing newline', () => {
    const file = join(tmpDir, 'out.json')
    writeJsonFileSafe(file, { hello: 'world' })
    const content = readFileSync(file, 'utf-8')
    expect(content).toBe('{\n  "hello": "world"\n}\n')
  })

  it('creates parent directories if needed', () => {
    const file = join(tmpDir, 'sub', 'dir', 'out.json')
    writeJsonFileSafe(file, { ok: true })
    expect(existsSync(file)).toBe(true)
  })
})

describe('applyUpdateSetting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('sets a new key in an existing file', () => {
    const file = join(tmpDir, 'settings.json')
    writeFileSync(file, '{"existing":"value"}')
    applyUpdateSetting(file, 'newKey', 'newValue')
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ existing: 'value', newKey: 'newValue' })
  })

  it('sets a nested key', () => {
    const file = join(tmpDir, 'settings.json')
    writeFileSync(file, '{}')
    applyUpdateSetting(file, 'a.b', true)
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ a: { b: true } })
  })

  it('creates the file if it does not exist', () => {
    const file = join(tmpDir, 'settings.json')
    applyUpdateSetting(file, 'key', 'val')
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ key: 'val' })
  })
})

describe('applyDeleteSetting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('removes a key from the file', () => {
    const file = join(tmpDir, 'settings.json')
    writeFileSync(file, '{"a":1,"b":2}')
    applyDeleteSetting(file, 'a')
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ b: 2 })
  })

  it('throws if file does not exist', () => {
    const file = join(tmpDir, 'missing.json')
    expect(() => applyDeleteSetting(file, 'a')).toThrow()
  })
})

describe('applyMoveSetting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('copies value to target and removes from source', () => {
    const from = join(tmpDir, 'from.json')
    const to = join(tmpDir, 'to.json')
    writeFileSync(from, '{"key":"value","other":1}')
    writeFileSync(to, '{"existing":true}')
    applyMoveSetting(from, to, 'key')
    expect(JSON.parse(readFileSync(from, 'utf-8'))).toEqual({ other: 1 })
    expect(JSON.parse(readFileSync(to, 'utf-8'))).toEqual({ existing: true, key: 'value' })
  })

  it('throws if key does not exist in source', () => {
    const from = join(tmpDir, 'from.json')
    const to = join(tmpDir, 'to.json')
    writeFileSync(from, '{}')
    writeFileSync(to, '{}')
    expect(() => applyMoveSetting(from, to, 'missing')).toThrow()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/functions/config-mutations.test.ts`
Expected: FAIL — cannot find module `./config-mutations.js`

**Step 3: Write the implementation**

```ts
// src/server/functions/config-mutations.ts
import { createServerFn } from '@tanstack/react-start'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { z } from 'zod'
import { resolveClaudeHome } from '../lib/claude-home.js'
import { getAtPath, setAtPath, deleteAtPath } from '../lib/json-path.js'
import type { JsonObject, JsonValue, ConfigLayerSource } from '@/types/config.js'

// --- Pure helpers (exported for testing) ---

export function readJsonFileSafe(filePath: string): JsonObject {
  if (!existsSync(filePath)) return {}
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as JsonObject
  } catch {
    return {}
  }
}

export function writeJsonFileSafe(filePath: string, data: JsonObject): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export function resolveLayerPath(
  layer: ConfigLayerSource,
  projectPath?: string,
): string {
  const claudeHome = resolveClaudeHome()
  switch (layer) {
    case 'global':
      return join(claudeHome, 'settings.json')
    case 'global-local':
      return join(claudeHome, 'settings.local.json')
    case 'project':
      if (!projectPath) throw new Error('projectPath required for project layer')
      return join(projectPath, '.claude', 'settings.json')
    case 'project-local':
      if (!projectPath) throw new Error('projectPath required for project-local layer')
      return join(projectPath, '.claude', 'settings.local.json')
  }
}

export function applyUpdateSetting(
  filePath: string,
  keyPath: string,
  value: JsonValue,
): void {
  const current = readJsonFileSafe(filePath)
  const updated = setAtPath(current, keyPath, value)
  writeJsonFileSafe(filePath, updated)
}

export function applyDeleteSetting(filePath: string, keyPath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`)
  }
  const current = readJsonFileSafe(filePath)
  const updated = deleteAtPath(current, keyPath)
  writeJsonFileSafe(filePath, updated)
}

export function applyMoveSetting(
  fromPath: string,
  toPath: string,
  keyPath: string,
): void {
  const fromData = readJsonFileSafe(fromPath)
  const value = getAtPath(fromData, keyPath)
  if (value === undefined) {
    throw new Error(`Key "${keyPath}" not found in source file`)
  }
  const toData = readJsonFileSafe(toPath)
  writeJsonFileSafe(toPath, setAtPath(toData, keyPath, value))
  writeJsonFileSafe(fromPath, deleteAtPath(fromData, keyPath))
}

// --- Server Functions ---

const updateSettingInput = z.object({
  layer: z.enum(['global', 'global-local', 'project', 'project-local']),
  projectPath: z.string().optional(),
  keyPath: z.string().min(1),
  value: z.unknown(),
})

export const updateSetting = createServerFn({ method: 'POST' })
  .inputValidator(updateSettingInput)
  .handler(async ({ data }) => {
    const filePath = resolveLayerPath(data.layer, data.projectPath)
    applyUpdateSetting(filePath, data.keyPath, data.value as JsonValue)
    return { success: true }
  })

const deleteSettingInput = z.object({
  layer: z.enum(['global', 'global-local', 'project', 'project-local']),
  projectPath: z.string().optional(),
  keyPath: z.string().min(1),
})

export const deleteSetting = createServerFn({ method: 'POST' })
  .inputValidator(deleteSettingInput)
  .handler(async ({ data }) => {
    const filePath = resolveLayerPath(data.layer, data.projectPath)
    applyDeleteSetting(filePath, data.keyPath)
    return { success: true }
  })

const moveSettingInput = z.object({
  fromLayer: z.enum(['global', 'global-local', 'project', 'project-local']),
  toLayer: z.enum(['global', 'global-local', 'project', 'project-local']),
  projectPath: z.string().optional(),
  keyPath: z.string().min(1),
})

export const moveSetting = createServerFn({ method: 'POST' })
  .inputValidator(moveSettingInput)
  .handler(async ({ data }) => {
    const fromPath = resolveLayerPath(data.fromLayer, data.projectPath)
    const toPath = resolveLayerPath(data.toLayer, data.projectPath)
    applyMoveSetting(fromPath, toPath, data.keyPath)
    return { success: true }
  })
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/functions/config-mutations.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/server/functions/config-mutations.ts src/server/functions/config-mutations.test.ts
git commit -m "feat: add settings mutation server functions (update/delete/move)"
```

---

### Task 5: Toast Notification System

Lightweight context-based toast for success/error feedback after mutations.

**Files:**
- Create: `src/components/ui/Toast.tsx`
- Modify: `src/routes/__root.tsx` (wrap app with ToastProvider)

**Step 1: Create the toast component**

```tsx
// src/components/ui/Toast.tsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm animate-in slide-in-from-bottom-2',
        toast.type === 'success' && 'bg-success/10 text-success border border-success/20',
        toast.type === 'error' && 'bg-danger/10 text-danger border border-danger/20',
      )}
    >
      {toast.type === 'success' ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 hover:opacity-70">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext>
  )
}
```

**Step 2: Find and read `__root.tsx`**

Read `src/routes/__root.tsx` to understand the current root layout before modifying it.

**Step 3: Wrap root layout with `ToastProvider`**

Add `import { ToastProvider } from '@/components/ui/Toast.js'` and wrap the root component's children with `<ToastProvider>...</ToastProvider>`.

**Step 4: Verify the app still starts**

Run: `npx vite dev --port 3456` (confirm no import errors, kill after page loads)

**Step 5: Commit**

```bash
git add src/components/ui/Toast.tsx src/routes/__root.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 6: Confirm Dialog Component

Reusable confirmation modal for destructive actions.

**Files:**
- Create: `src/components/ui/ConfirmDialog.tsx`

**Step 1: Create the component**

```tsx
// src/components/ui/ConfirmDialog.tsx
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="backdrop:bg-black/50 bg-surface-1 border border-border-default rounded-xl p-0 max-w-md w-full shadow-xl"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {variant === 'danger' && (
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              variant === 'danger'
                ? 'bg-danger text-white hover:bg-danger/90'
                : 'bg-accent text-white hover:bg-accent/90',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
```

**Step 2: Verify the app still builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ui/ConfirmDialog.tsx
git commit -m "feat: add reusable confirm dialog component"
```

---

### Task 7: Editable Settings Viewer

Transform the read-only `SettingsViewer` into an interactive component with inline editing, delete, and move actions. This is the largest task — it modifies the existing component to support an `editable` prop.

**Files:**
- Modify: `src/components/config/SettingsViewer.tsx`
- Create: `src/components/config/SettingActions.tsx`
- Create: `src/components/config/AddSettingForm.tsx`

**Step 1: Create the SettingActions component**

This component renders the hover action buttons (edit, delete, move) for each setting key.

```tsx
// src/components/config/SettingActions.tsx
import { useState } from 'react'
import { Pencil, Trash2, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConfigLayerSource } from '@/types/config.js'

const LAYER_LABELS: Record<ConfigLayerSource, string> = {
  global: 'Global',
  'global-local': 'Global Local',
  project: 'Project',
  'project-local': 'Project Local',
}

const ALL_LAYERS: ConfigLayerSource[] = ['global', 'global-local', 'project', 'project-local']

interface SettingActionsProps {
  currentLayer: ConfigLayerSource
  onEdit: () => void
  onDelete: () => void
  onMove: (targetLayer: ConfigLayerSource) => void
  showMove?: boolean
}

export function SettingActions({
  currentLayer,
  onEdit,
  onDelete,
  onMove,
  showMove = true,
}: SettingActionsProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const availableLayers = ALL_LAYERS.filter((l) => l !== currentLayer)

  return (
    <span className="inline-flex items-center gap-0.5 opacity-0 group-hover/setting:opacity-100 transition-opacity ml-2">
      <button
        onClick={onEdit}
        title="Edit value"
        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent transition-colors"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={onDelete}
        title="Delete setting"
        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-danger transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {showMove && (
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu((prev) => !prev)}
            title="Move to another layer"
            className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent transition-colors"
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>
          {showMoveMenu && (
            <div className="absolute top-full right-0 mt-1 bg-surface-1 border border-border-default rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              {availableLayers.map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setShowMoveMenu(false)
                    onMove(layer)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  {LAYER_LABELS[layer]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
```

**Step 2: Create the AddSettingForm component**

```tsx
// src/components/config/AddSettingForm.tsx
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JsonValue } from '@/types/config.js'

interface AddSettingFormProps {
  onAdd: (keyPath: string, value: JsonValue) => void
  onCancel: () => void
}

type ValueType = 'string' | 'number' | 'boolean' | 'json'

function parseValue(raw: string, type: ValueType): JsonValue {
  switch (type) {
    case 'string':
      return raw
    case 'number':
      return Number(raw)
    case 'boolean':
      return raw === 'true'
    case 'json':
      return JSON.parse(raw) as JsonValue
  }
}

export function AddSettingForm({ onAdd, onCancel }: AddSettingFormProps) {
  const [keyPath, setKeyPath] = useState('')
  const [rawValue, setRawValue] = useState('')
  const [valueType, setValueType] = useState<ValueType>('string')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    setError(null)
    if (!keyPath.trim()) {
      setError('Key path is required')
      return
    }
    try {
      const value = parseValue(rawValue, valueType)
      onAdd(keyPath.trim(), value)
    } catch {
      setError('Invalid value for selected type')
    }
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">Add Setting</span>
        <button onClick={onCancel} className="p-1 rounded hover:bg-surface-2 text-text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Key path (e.g. permissions.allow)"
          value={keyPath}
          onChange={(e) => setKeyPath(e.target.value)}
          className="w-full bg-surface-0 border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="flex gap-2">
          <select
            value={valueType}
            onChange={(e) => setValueType(e.target.value as ValueType)}
            className="bg-surface-0 border border-border-default rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON</option>
          </select>

          {valueType === 'boolean' ? (
            <select
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              className="flex-1 bg-surface-0 border border-border-default rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type={valueType === 'number' ? 'number' : 'text'}
              placeholder="Value"
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              className="flex-1 bg-surface-0 border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        onClick={handleSubmit}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add
      </button>
    </div>
  )
}
```

**Step 3: Update SettingsViewer to support editing**

Add an `editable` prop and `onUpdate`/`onDelete`/`onMove` callbacks. When `editable` is true, render `SettingActions` beside each key and support inline value editing. When false, behavior is unchanged from current read-only mode.

Key changes to `src/components/config/SettingsViewer.tsx`:

- Add props: `editable?: boolean`, `onUpdate?: (keyPath: string, value: JsonValue) => void`, `onDelete?: (keyPath: string) => void`, `onMove?: (keyPath: string, targetLayer: ConfigLayerSource) => void`, `onAdd?: (keyPath: string, value: JsonValue) => void`
- Wrap each setting row in a `group/setting` div for hover actions
- When a value is clicked in edit mode, replace it with an inline input
- Add an "Add Setting" button at the bottom when `editable` is true
- The existing read-only rendering stays as-is when `editable` is false

This is a significant modification. The component needs internal state for:
- `editingKey: string | null` — which key path is being edited
- `editValue: string` — the current edit input value
- `showAddForm: boolean` — whether the add setting form is visible

**Step 4: Verify the app still builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/config/SettingsViewer.tsx src/components/config/SettingActions.tsx src/components/config/AddSettingForm.tsx
git commit -m "feat: add inline settings editing with action buttons and add form"
```

---

### Task 8: Wire Up Global Settings Page

Connect the mutations to the global settings route. Add mutation calls, confirmation dialogs, and toast feedback.

**Files:**
- Modify: `src/routes/global/settings.tsx`

**Step 1: Add mutation imports and hooks**

Add imports for `updateSetting`, `deleteSetting`, `moveSetting` from `config-mutations.js`, plus `useToast`, `ConfirmDialog`, and React state for the confirmation flow.

**Step 2: Add mutation handlers**

Create handler functions that:
- `handleUpdate(layer, keyPath, value)` — calls `updateSetting`, shows success toast, reloads route data
- `handleDelete(layer, keyPath)` — opens ConfirmDialog, on confirm calls `deleteSetting`, shows toast
- `handleMove(layer, keyPath, targetLayer)` — opens ConfirmDialog explaining the move, on confirm calls `moveSetting`, shows toast
- `handleAdd(layer, keyPath, value)` — calls `updateSetting` (same API), shows success toast

**Step 3: Pass editable props to SettingsViewer**

For each layer section, pass `editable={true}` and the corresponding handlers to `SettingsViewer`. Pass the layer source so handlers know which file to target.

**Step 4: Add ConfirmDialog instance**

Add a single `<ConfirmDialog>` at the bottom of the page component, driven by state (`confirmAction`, `confirmTitle`, `confirmMessage`).

**Step 5: Route data revalidation**

After each successful mutation, call `router.invalidate()` from TanStack Router to re-run the loader and refresh displayed settings.

**Step 6: Test manually**

1. Start dev server: `npm run dev`
2. Navigate to `/global/settings`
3. Click a value → inline edit → save → verify toast + value updates
4. Click delete → confirm dialog → verify key removed
5. Click add setting → fill form → verify new key appears

**Step 7: Commit**

```bash
git add src/routes/global/settings.tsx
git commit -m "feat: wire up settings editing on global settings page"
```

---

### Task 9: Wire Up Project Settings Page

Same mutation wiring for the project-scoped settings page.

**Files:**
- Modify: `src/routes/projects/$projectId/settings.tsx`

**Step 1: Add mutation imports and handlers**

Same pattern as Task 8, but include `projectPath` from the route params in all mutation calls.

**Step 2: Pass editable props to LayerSection**

Thread `editable` and handler props through `LayerSection` down to `SettingsViewer`.

**Step 3: Add ConfirmDialog and toast calls**

Same pattern as global page.

**Step 4: Test manually**

1. Navigate to `/projects/<projectId>/settings`
2. Test add/edit/delete/move operations on project-scoped settings
3. Verify moves between project and project-local layers work

**Step 5: Commit**

```bash
git add src/routes/projects/\$projectId/settings.tsx
git commit -m "feat: wire up settings editing on project settings page"
```

---

### Task 10: End-to-End Verification

Final check that all pieces work together.

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All server tests pass

**Step 2: Run type checker**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Manual smoke test**

1. Start dev server
2. Global settings: add a new key, edit it, move it to global-local, delete from global-local
3. Project settings: add key to project scope, move to project-local, delete
4. Verify confirmation dialogs appear for delete and move
5. Verify toasts appear for all operations
6. Verify settings files on disk reflect the changes

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found in e2e verification"
```

(Only if fixes were needed.)
