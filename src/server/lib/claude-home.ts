import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export function resolveClaudeHome(): string {
  const envHome = process.env['CLAUDE_HOME']
  if (envHome && existsSync(envHome)) {
    return envHome
  }
  return join(homedir(), '.claude')
}
