# Configuration Editor Milestone Design

Field Station graduates from read-only config viewer to interactive config manager.

## Approach

**Direct File I/O** — New server mutation functions mirror the existing read paths. Each write function reads the target file, applies the change in memory, writes the whole file back. No staging layer, no git-backing — simple read-modify-write for a single-user local tool.

## Phased Milestone

### Phase 1: Core Settings Editing

Add/edit/delete JSON settings values in any of the 4 config layers (global, global-local, project, project-local). Move settings between layers. Create new settings keys. Confirmation dialogs for destructive operations.

### Phase 2: Resource File Editing

Inline markdown editor for user-owned agents, commands, skills. Frontmatter-aware editing (structured fields + body content). Create new resources from the UI. Delete user-owned files. Read-only badge + locked state for plugin-provided resources.

**Ownership rule:** Files inside `plugins/cache/` are read-only. Files in the user's own `~/.claude/agents/`, `~/.claude/commands/`, etc. (or project equivalents) are editable. Determined by file path.

### Phase 3: Plugin Management

Enable/disable toggle for installed plugins (writes `enabledPlugins` in `settings.json`). Impact preview showing what agents/commands/skills a plugin provides.

### Phase 4: Validation & Config Intelligence

Schema-aware validation for known Claude Code settings (types, allowed values). Inline warnings for unknown settings, type mismatches, and shadowed values. Layer conflict view filtering to settings that appear in multiple layers.

### Phase 5: Config History & Templates

Snapshots: save/compare timestamped config snapshots (stored in `data/snapshots/`). Templates: save/apply named config profiles (stored in `data/templates/`). Import/export: bundle a project's full config into a shareable `.json` archive.

## Server Architecture

### Settings Mutations (`src/server/functions/config-mutations.ts`)

| Function | Input | Effect |
|----------|-------|--------|
| `updateSetting` | `{ layer, keyPath, value }` | Sets a key at a dot-path in the target layer's JSON file |
| `deleteSetting` | `{ layer, keyPath }` | Removes a key from the target layer's JSON file |
| `moveSetting` | `{ fromLayer, toLayer, keyPath }` | Copies key+value to target layer, removes from source |
| `createSettingsFile` | `{ layer }` | Creates empty settings JSON if it doesn't exist |

### Resource Mutations (`src/server/functions/resource-mutations.ts`)

| Function | Input | Effect |
|----------|-------|--------|
| `createResource` | `{ scope, type, name, frontmatter, body }` | Creates a new .md file for agent/command/skill |
| `updateResource` | `{ filePath, frontmatter, body }` | Overwrites a user-owned .md file |
| `deleteResource` | `{ filePath }` | Deletes a user-owned .md file |

### Plugin Mutations (added to `src/server/functions/plugins.ts`)

| Function | Input | Effect |
|----------|-------|--------|
| `togglePlugin` | `{ pluginId, enabled }` | Updates `enabledPlugins[pluginId]` in global `settings.json` |

### Safety (`src/server/lib/ownership.ts`)

- `isUserOwned(filePath)` returns `true` if path is NOT inside `plugins/cache/`
- All write functions validate ownership before modifying files
- All write functions validate input with Zod schemas
- Settings mutations do atomic read-modify-write (read JSON, patch, write back)

## Frontend UX

### Settings Editing (Phase 1)

- **Inline edit mode** on config tree values (click to edit, type-appropriate inputs)
- **Action buttons per key** on hover: edit, delete, move (with layer picker dropdown)
- **"Add Setting" button** per layer section with key path + value + type form
- **Layer badge interaction** — clickable badges with "Move to [layer]" popover

### Resource Editing (Phase 2)

- **Edit button on FileCard** for user-owned resources; lock icon for plugin-provided
- **Resource editor** — form with structured frontmatter fields + markdown body textarea
- **"New Agent/Command/Skill" button** on listing pages
- **Delete action** with confirmation dialog

### Plugin Management (Phase 3)

- **Toggle switch on PluginCard** for enable/disable
- **Impact preview** showing what the plugin provides (agent/command/skill counts)

### Shared UI Patterns

- **ConfirmDialog** — reusable modal for destructive actions
- **Toast notifications** — success/error feedback via context + CSS animation
- **TanStack Query mutations** with `onSuccess` invalidation (no optimistic UI)

## Advanced Features

### Phase 4: Validation

- Static settings schema (`src/server/lib/settings-schema.ts`) with known keys, types, allowed values
- Inline warnings: unknown setting, type mismatch, shadowed by project
- Layer conflict view filtering to multi-layer settings

### Phase 5: History & Templates

- Snapshots saved to `data/snapshots/` as timestamped JSON bundles
- Templates saved to `data/templates/` as named config profiles (settings JSON only)
- Import/export bundles full config (settings + resource files) into `.json` archive
- All Field Station metadata in `data/`, separate from `~/.claude/`
