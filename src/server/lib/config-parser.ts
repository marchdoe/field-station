import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { resolveClaudeHome } from './claude-home.js'
import type { ConfigLayer, EffectiveConfig, JsonObject } from '@/types/config.js'

function readJsonFile(filePath: string): JsonObject | null {
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as JsonObject
  } catch {
    return null
  }
}

function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
  const result: JsonObject = { ...target }
  for (const key of Object.keys(source)) {
    const targetVal = target[key]
    const sourceVal = source[key]
    if (
      targetVal &&
      sourceVal &&
      typeof targetVal === 'object' &&
      typeof sourceVal === 'object' &&
      !Array.isArray(targetVal) &&
      !Array.isArray(sourceVal)
    ) {
      result[key] = deepMerge(
        targetVal as JsonObject,
        sourceVal as JsonObject,
      )
    } else {
      result[key] = sourceVal
    }
  }
  return result
}

export function getConfigLayer(filePath: string, source: ConfigLayer['source']): ConfigLayer {
  const exists = existsSync(filePath)
  const content = exists ? readJsonFile(filePath) : null
  return { source, filePath, exists, content }
}

export function mergeConfigLayers(projectPath?: string): EffectiveConfig {
  const claudeHome = resolveClaudeHome()

  const layers: ConfigLayer[] = [
    getConfigLayer(join(claudeHome, 'settings.json'), 'global'),
    getConfigLayer(join(claudeHome, 'settings.local.json'), 'global-local'),
  ]

  if (projectPath) {
    layers.push(
      getConfigLayer(join(projectPath, '.claude', 'settings.json'), 'project'),
      getConfigLayer(join(projectPath, '.claude', 'settings.local.json'), 'project-local'),
    )
  }

  let merged: JsonObject = {}
  for (const layer of layers) {
    if (layer.exists && layer.content && typeof layer.content === 'object') {
      merged = deepMerge(merged, layer.content as JsonObject)
    }
  }

  return { merged, layers }
}
