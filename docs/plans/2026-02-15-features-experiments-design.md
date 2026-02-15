# Features & Experiments Panel

## Overview

A dedicated page at `/global/features` that surfaces all Claude Code feature flags and experimental settings as a toggle panel. Combines auto-discovery (scanning the Claude binary) with a curated registry of documented features.

## Goals

- Always know what experimental and configurable features exist
- Toggle features on/off globally from a single panel
- Auto-discover new features when Claude Code updates
- Provide descriptions and context for well-known features

## Data Architecture

### Binary Scanner (`src/server/lib/claude-binary.ts`)

Locates and scans the installed Claude Code binary to discover feature flags.

**Binary location:**
- `which claude` → resolve symlink → version-specific binary path
- Example: `/Users/x/.local/share/claude/versions/2.1.42`

**Extraction:**
- Run `strings <binary>` piped through grep for `^CLAUDE_CODE_[A-Z0-9_]+$` and `^DISABLE_[A-Z0-9_]+$`
- Filter out noise: exclude strings containing spaces, lowercase, or punctuation (error messages)
- Settings keys (camelCase) cannot be reliably auto-discovered; rely on the registry for those

**Version detection:**
- Run `claude --version` to get the installed version string
- Cache scan results in memory keyed by version
- Re-check version on each page load (cheap call), re-scan only when version changes

**Error handling:**
- Claude not installed → return empty scan, UI shows "Claude Code not found"
- Binary scan fails → fall back to registry-only mode with a note

### Feature Registry (`src/server/lib/feature-registry.ts`)

Static TypeScript array of documented features:

```ts
interface FeatureDefinition {
  key: string              // "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" or "alwaysThinkingEnabled"
  type: "env" | "setting"  // where it's configured
  name: string             // "Agent Teams"
  description: string      // "Multi-agent collaboration with team lead..."
  category: "experimental" | "model" | "ui" | "security" | "telemetry" | "advanced"
  valueType: "boolean" | "string" | "number"
  defaultValue?: string    // what Claude uses when unset
  options?: string[]       // for string enums like effort level
}
```

~35 documented features to start, covering:
- Experimental: Agent Teams, Auto Memory, Experimental Betas
- Model: Effort Level, Max Output Tokens, Thinking Tokens, Prompt Caching, Always Thinking
- UI: Spinner Tips, Terminal Progress Bar, Reduced Motion, Show Turn Duration, Prompt Suggestions, Fast Mode
- Security: Sandbox, Command Injection Check, Dangerous Mode Prompt Skip
- Telemetry: Telemetry, Error Reporting, Nonessential Traffic
- Advanced: Background Tasks, File Checkpointing, Auto-compact, Respecte Gitignore, Auto Updates Channel

Features discovered by the scanner but not in the registry get `category: "undocumented"`.

### Server Function (`src/server/functions/features.ts`)

Single function `getFeatures()` that:
1. Runs the binary scanner (cached)
2. Reads `~/.claude/settings.json` for current state
3. Merges registry + scanner + current values into a unified list

Returns:
```ts
interface Feature {
  definition: FeatureDefinition  // from registry, or synthetic for undocumented
  currentValue: string | null    // null = not set (using default)
  source: "env" | "setting"     // where the current value lives
  isDocumented: boolean
}
```

## UI Design

### Route: `/global/features`

Added to the global sidebar alongside Settings, Hooks, Agents, etc.

### Layout

**Header area:**
- Page title: "Features & Experiments"
- Version indicator: "Claude Code v2.1.42 — 158 detected, 35 documented"
- Search input for filtering by name or key
- Category filter chips

**Feature list:**
- Grouped by category with section headers
- Each feature renders as a FeatureCard

**Restart banner:**
- Appears after any toggle change
- "Settings updated. Restart Claude Code for changes to take effect."
- Persistent until dismissed

### FeatureCard Component

Each feature shows:
- Toggle switch (for booleans) or dropdown/input (for string/number values)
- Feature name (bold)
- Key name in monospace, smaller text
- One-line description
- Badges: "experimental" (orange), "env" / "setting" (subtle gray)
- Undocumented features: dimmed styling, key name only, no description

### Components

- `src/components/features/FeatureList.tsx` — Category grouping, filtering, search
- `src/components/features/FeatureCard.tsx` — Individual feature toggle/display

## Mutation Strategy

### Toggle on
- `type: "setting"` → `updateSetting({ layer: "global", keyPath: "<key>", value: true })`
- `type: "env"` → `updateSetting({ layer: "global", keyPath: "env.<KEY>", value: "1" })`
- Non-boolean values use the appropriate value from dropdown/input

### Toggle off
- `deleteSetting({ layer: "global", keyPath: "<key>" })` — removes the key so Claude uses its default
- If `env` object becomes empty after deletion, leave it as-is

### Which file
- All writes go to `~/.claude/settings.json` (global layer)
- Uses existing mutation infrastructure (`updateSetting`, `deleteSetting`)

## Files

| Action | Path |
|--------|------|
| CREATE | `src/server/lib/claude-binary.ts` |
| CREATE | `src/server/lib/feature-registry.ts` |
| CREATE | `src/server/functions/features.ts` |
| CREATE | `src/routes/global/features.tsx` |
| CREATE | `src/components/features/FeatureCard.tsx` |
| CREATE | `src/components/features/FeatureList.tsx` |
| MODIFY | `src/components/layout/Sidebar.tsx` |
| CREATE | `src/server/lib/claude-binary.test.ts` |
| CREATE | `src/server/lib/feature-registry.test.ts` |

## What We're NOT Doing

- **No project-level feature page** — features are global; per-project env overrides can still be set via the existing settings page
- **No auto-restart of Claude** — user restarts manually
- **No live feature detection** — we scan the binary, not a running process
- **No settings.json schema validation** — separate concern for a future phase
