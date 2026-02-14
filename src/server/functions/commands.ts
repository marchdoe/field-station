import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { resolveClaudeHome } from '../lib/claude-home.js'
import { truncateBody } from '../lib/markdown-parser.js'
import { redactSensitiveValues } from '../lib/redact.js'
import { isUserOwned } from '../lib/ownership.js'
import { scopeInput } from '../lib/validation.js'
import type { CommandFile, CommandDetail } from '@/types/config.js'

function readCommandsFromDir(dir: string): { folders: string[]; commands: CommandFile[] } {
  if (!existsSync(dir)) return { folders: [], commands: [] }

  const entries = readdirSync(dir)
  const folders: string[] = []
  const commands: CommandFile[] = []

  for (const entry of entries) {
    const entryPath = join(dir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      folders.push(entry)
      const mdFiles = readdirSync(entryPath).filter((f) => f.endsWith('.md'))
      for (const fileName of mdFiles) {
        const filePath = join(entryPath, fileName)
        const content = readFileSync(filePath, 'utf-8')
        commands.push({
          name: fileName.replace('.md', ''),
          fileName,
          filePath,
          folder: entry,
          bodyPreview: truncateBody(content, 5),
          isEditable: isUserOwned(filePath),
        })
      }
    }
  }

  return { folders, commands }
}

const getCommandInput = z.object({
  scope: z.enum(['global', 'project']),
  projectPath: z.string().optional(),
  folder: z.string().min(1),
  name: z.string().min(1),
})

export const getCommand = createServerFn({ method: 'GET' })
  .inputValidator(getCommandInput)
  .handler(async ({ data }): Promise<CommandDetail> => {
    let dir: string
    if (data.scope === 'global') {
      dir = join(resolveClaudeHome(), 'commands')
    } else if (data.projectPath) {
      dir = join(data.projectPath, '.claude', 'commands')
    } else {
      throw new Error('projectPath required for project scope')
    }

    const filePath = join(dir, data.folder, `${data.name}.md`)
    if (!existsSync(filePath)) {
      throw new Error(`Command not found: ${filePath}`)
    }

    const content = readFileSync(filePath, 'utf-8')
    return redactSensitiveValues({
      name: data.name,
      fileName: `${data.name}.md`,
      filePath,
      folder: data.folder,
      body: content,
      isEditable: isUserOwned(filePath),
    })
  })

export const listCommands = createServerFn({ method: 'GET' })
  .inputValidator(scopeInput)
  .handler(
    async ({ data }): Promise<{ folders: string[]; commands: CommandFile[] }> => {
      let dir: string
      if (data.scope === 'global') {
        dir = join(resolveClaudeHome(), 'commands')
      } else if (data.projectPath) {
        dir = join(data.projectPath, '.claude', 'commands')
      } else {
        return { folders: [], commands: [] }
      }
      return redactSensitiveValues(readCommandsFromDir(dir))
    },
  )
