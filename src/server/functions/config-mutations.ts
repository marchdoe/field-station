import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  resolveLayerPath,
  applyUpdateSetting,
  applyDeleteSetting,
  applyMoveSetting,
} from '../lib/config-writer.js'
import type { JsonValue } from '@/types/config.js'

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
