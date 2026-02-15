# Field Station

A visual configuration explorer and management tool for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Browse, inspect, and edit your Claude Code settings, agents, commands, skills, hooks, and plugins through a local web interface instead of manually navigating `~/.claude/` and editing JSON files.

## Prerequisites

- **Node.js** (modern version with ES module support)
- **Claude Code** installed with a `~/.claude/` directory
- At least one project registered in `~/.claude/projects/`

## Getting Started

```bash
npm install
npm run dev
```

The app runs at **http://localhost:3456**.

On first launch you'll see a welcome screen. Click **Run Setup** to scan for Claude Code projects and select which ones to track.

## Building for Production

```bash
npm run build
npm run preview
```

## What You Can Do

### Global Settings

View and edit configuration across all four layers — global, global local, project, and project local — with a merged "effective config" view. Sensitive values like API keys are automatically redacted.

### Projects

Browse all your registered Claude Code projects. Each project shows its path, whether a `CLAUDE.md` exists, and counts of agents, commands, and skills. Drill into any project to manage its resources.

### Agents, Commands & Skills

Browse, create, edit, and delete markdown-based resources:

- **Agents** — custom AI agent definitions with frontmatter (name, description, tools)
- **Commands** — slash commands organized by folder
- **Skills** — skill packages with `SKILL.md` files

Files are displayed with syntax-highlighted previews and parsed YAML frontmatter.

### Hooks

View hook configurations (SessionStart, Stop, PreToolUse, etc.) from your settings, with color-coded event types and handler details.

### Plugins

See installed plugins with version info, install dates, git commit SHAs, and enabled/disabled status. Links to plugin homepages when available.

## Architecture

Field Station is a full-stack TypeScript application built on [TanStack Start](https://tanstack.com/start) with file-based routing via [TanStack Router](https://tanstack.com/router). The server layer runs on [Nitro](https://nitro.build) and uses TanStack Start's `createServerFn` for server-side operations like reading/writing config files and scanning the filesystem.

**Key libraries:**

- **Tailwind CSS** — styling with a custom dark/light theme system
- **Shiki** — dual-theme syntax highlighting for code and markdown previews
- **react-markdown** — rendering markdown content with GFM support
- **gray-matter** — parsing YAML frontmatter from resource files
- **Zod** — schema validation
- **Lucide React** — icons

## Testing

```bash
npm run test        # run tests
npm run typecheck   # type check
```

## License

Private
