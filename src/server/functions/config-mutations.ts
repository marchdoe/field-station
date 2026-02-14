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
