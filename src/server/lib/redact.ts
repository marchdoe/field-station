const SENSITIVE_KEY_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
  /api_key/i,
  /auth/i,
  /private/i,
]

const SENSITIVE_VALUE_PATTERNS = [
  /^sk-[a-zA-Z0-9-_]{20,}/, // Anthropic / OpenAI keys
  /^sk-ant-[a-zA-Z0-9-_]+/, // Anthropic API keys
  /^ghp_[a-zA-Z0-9]{36}/, // GitHub personal access tokens
  /^gho_[a-zA-Z0-9]{36}/, // GitHub OAuth tokens
  /^github_pat_[a-zA-Z0-9_]+/, // GitHub fine-grained PATs
  /^Bearer\s+\S+/i, // Bearer tokens
  /^xox[bpsa]-[a-zA-Z0-9-]+/, // Slack tokens
  /^eyJ[a-zA-Z0-9_-]+\.eyJ/, // JWTs
  /^AKIA[A-Z0-9]{16}/, // AWS access keys
  /^npm_[a-zA-Z0-9]{36}/, // npm tokens
]

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))
}

function redactString(value: string): string {
  if (isSensitiveValue(value)) {
    return '[REDACTED]'
  }
  return value
}

export function redactSensitiveValues<T>(data: T): T {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    return redactString(data) as T
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveValues(item)) as T
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'env' && typeof value === 'object' && value !== null) {
        const redactedEnv: Record<string, string> = {}
        for (const envKey of Object.keys(value as Record<string, string>)) {
          redactedEnv[envKey] = '[REDACTED]'
        }
        result[key] = redactedEnv
      } else if (isSensitiveKey(key) && typeof value === 'string') {
        result[key] = '[REDACTED]'
      } else {
        result[key] = redactSensitiveValues(value)
      }
    }
    return result as T
  }

  return data
}
