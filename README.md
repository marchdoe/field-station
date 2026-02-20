# Field Station

A visual configuration explorer and management tool for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Browse, inspect, and edit your Claude Code settings, agents, commands, skills, hooks, and plugins through a local web interface instead of manually navigating `~/.claude/` and editing JSON files.

## Prerequisites

- **Go 1.22+**
- **Node.js** (for development only)
- **Claude Code** installed with a `~/.claude/` directory

## Getting Started (Development)

```bash
npm install

# Terminal 1 — Go backend on :3457
make dev-server

# Terminal 2 — Vite frontend on :3456
make dev-frontend
```

Open **http://localhost:3456**.

## Building the Binary

Produces a single self-contained binary with the frontend embedded:

```bash
make build          # runs npm run build + go build
./field-station     # serves on http://localhost:3457
```

## Installing from Source

```bash
make build
cp field-station /usr/local/bin/
```

## Running as a Service

Field Station can run as a persistent background service.

### Docker

```bash
docker compose up -d
```

Then open http://localhost:3457.

### macOS (launchd)

1. Build the binary: `make build`
2. Copy and configure the plist:
   ```bash
   cp deploy/field-station.plist ~/Library/LaunchAgents/com.fieldstation.app.plist
   ```
3. Edit `~/Library/LaunchAgents/com.fieldstation.app.plist` — set `WorkingDirectory` and `ExecStart` to the `field-station` binary path
4. Load the service:
   ```bash
   mkdir -p ~/Library/Logs/field-station
   launchctl load ~/Library/LaunchAgents/com.fieldstation.app.plist
   ```

To stop: `launchctl unload ~/Library/LaunchAgents/com.fieldstation.app.plist`

### Linux (systemd)

1. Build the binary: `make build`
2. Copy and configure the unit:
   ```bash
   cp deploy/field-station.service ~/.config/systemd/user/field-station.service
   ```
3. Edit `~/.config/systemd/user/field-station.service` — set `ExecStart` to the `field-station` binary path
4. Enable and start:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now field-station
   ```

## What You Can Do

### Global Settings

View and edit configuration across all four layers — global, global local, project, and project local — with a merged "effective config" view. Sensitive values like API keys are automatically redacted.

### Projects

Browse all your Claude Code projects. Drill into any project to manage its resources.

### Agents, Commands & Skills

Browse, create, edit, and delete markdown-based resources:

- **Agents** — custom AI agent definitions with frontmatter (name, description, tools)
- **Commands** — slash commands organized by folder
- **Skills** — skill packages with `SKILL.md` files

Files are displayed with syntax-highlighted previews and parsed YAML frontmatter.

### Hooks

View hook configurations (SessionStart, Stop, PreToolUse, etc.) from your settings, with color-coded event types and handler details.

### Plugins

See installed plugins with enabled/disabled status.

## Architecture

Field Station is a Go backend + Vite/React SPA. The Go server (`server/`) provides a REST API on `:3457`. In production, the Vite build is embedded directly in the binary via `//go:embed`. In development, the Vite dev server proxies `/api/*` to the Go backend.

**Backend:** Go `net/http`, `oapi-codegen` (OpenAPI-first), `fsnotify` for live updates

**Frontend:** React 19, React Router v7, TanStack Query v5, Tailwind CSS, Shiki

## Testing

```bash
make test       # Go tests + Vitest
npm run check   # Biome lint + format
npm run typecheck
```

## License

Private
