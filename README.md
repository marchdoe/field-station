# Field Station

A local web interface for managing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) configuration. Instead of manually editing JSON files and hunting through `~/.claude/`, Field Station gives you a browser UI to browse, inspect, and edit everything Claude Code stores on disk.

<img width="800" alt="Screenshot 2026-02-21 at 8 06 16 PM" src="https://github.com/user-attachments/assets/00d8d206-4c2e-42a6-8c74-d1659efafd67" />

## What it does

**Configuration** — View settings across all four layers (global, global-local, project, project-local) with a merged "effective config" view. Sensitive values like API keys are automatically redacted.

**Projects** — Browse all your Claude Code projects and drill into each one to manage its resources independently.

**Agents, Commands & Skills** — Create, edit, and delete markdown-based resources. Files are displayed with syntax-highlighted previews and parsed YAML frontmatter.

**Instructions** — View and edit `CLAUDE.md` and `CLAUDE.local.md` at both global (`~/.claude/`) and per-project scope, with a markdown preview and inline editor.

**Memory** — Browse, create, edit, and delete per-project auto-memory files (`~/.claude/projects/<id>/memory/*.md`) — the files Claude Code writes to persist context across sessions.

**Hooks** — Inspect your hook configurations (SessionStart, Stop, PreToolUse, etc.) with color-coded event types and handler details.

**Plugins** — See all installed plugins with enabled/disabled status.

**Features & Experiments** — Browse Claude Code feature flags, see their current values, and toggle them.

**Search** — Global search across all resources (Cmd+K / Ctrl+K).

**Change History** — Every write operation is backed up first. You can browse the change timeline and restore any previous version of any file.

**Authentication** — Optional token-based auth for running on a server or shared machine. Set `FIELD_STATION_TOKEN` and the UI requires a login before granting access.

**Live updates** — The UI refreshes automatically via SSE when files change on disk or when Claude Code is upgraded.

## Architecture

Field Station is a self-contained Go binary with the React frontend embedded inside it. There are no external dependencies at runtime.

```
server/          Go backend (net/http, oapi-codegen, fsnotify)
  openapi.yaml   Source of truth — generates Go types and TS types
  api/           REST API handlers (generated + hand-written)
  lib/           Core logic: config parsing, file I/O, path safety
  middleware/    Auth (HMAC session tokens)
  main.go        HTTP server on :3457, embeds server/dist/

src/             React frontend (Vite, React Router v7, TanStack Query)
  lib/api.ts     Typed REST client, generated from openapi.yaml
  routes/        Page components
  components/    Shared UI
```

In development, Vite runs on `:3456` and proxies `/api/*` to the Go backend on `:3457`. In production a single binary serves both on `:3457`.

The OpenAPI spec drives everything — `make generate` regenerates Go server stubs, `make generate-ts` regenerates the TypeScript client types.

## Development

**Prerequisites:** Go 1.22+, Node.js 20+, Claude Code installed (`~/.claude/` must exist)

```bash
npm install

# Terminal 1 — Go backend
make dev-server

# Terminal 2 — Vite dev server
make dev-frontend
```

Open **http://localhost:3456**.

## Authentication

By default Field Station requires no login — suitable for local use. To protect a shared or remote deployment, set `FIELD_STATION_TOKEN` before starting the server:

```bash
# Generate a secure token (do this once, save the value)
openssl rand -hex 32

# Start with auth enabled
FIELD_STATION_TOKEN=<your-token> ./field-station
```

Anyone opening the UI will be prompted to enter this token. Sessions are HMAC-signed and stored in a cookie — the token never leaves the server.

For development, `make dev-server` starts without auth unless you export `FIELD_STATION_TOKEN` in your shell first.

## Building

Produces a single self-contained binary with the frontend embedded:

```bash
make build
./field-station     # http://localhost:3457
```

## Running on a VPS

The recommended approach is to build the binary, copy it to the server, and run it behind a reverse proxy.

**1. Build and copy**

```bash
make build
scp field-station user@your-server:/usr/local/bin/
```

**2. Set an auth token** (required for any remote deployment)

```bash
export FIELD_STATION_TOKEN=your-secret-token
./field-station
```

The token is set once at startup. Anyone who opens the UI must enter it on the login screen. Sessions are signed with HMAC and stored in a cookie.

**3. Reverse proxy with nginx** (optional but recommended for TLS)

```nginx
server {
    listen 443 ssl;
    server_name fieldstation.example.com;

    location / {
        proxy_pass http://127.0.0.1:3457;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # SSE requires buffering disabled
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

**Note:** Field Station reads `~/.claude/` on the server. On a VPS this should be the Claude Code config of the user account running the process.

## Running as a Service

### Docker

```bash
docker compose up -d
```

Edit `docker-compose.yml` to adjust the volume paths for your Claude binary location (macOS Homebrew vs Linux npm global install differ).

### macOS (launchd)

```bash
make build
cp deploy/field-station.plist ~/Library/LaunchAgents/com.fieldstation.app.plist
# Edit the plist to set WorkingDirectory and the path to the binary
mkdir -p ~/Library/Logs/field-station
launchctl load ~/Library/LaunchAgents/com.fieldstation.app.plist
```

To stop: `launchctl unload ~/Library/LaunchAgents/com.fieldstation.app.plist`

### Linux (systemd)

```bash
make build
cp deploy/field-station.service ~/.config/systemd/user/field-station.service
# Edit the service file to set ExecStart to the binary path
systemctl --user daemon-reload
systemctl --user enable --now field-station
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `FIELD_STATION_TOKEN` | _(none)_ | Auth token. If unset, no login is required. |
| `FIELD_STATION_ADDR` | `127.0.0.1:3457` | Listen address. Set to `:3457` for Docker or remote access. |
| `CLAUDE_HOME` | `~/.claude` | Override the Claude config directory. |
| `FIELD_STATION_DEV` | `0` | Set to `1` to skip embedding and proxy to Vite (set automatically by `make dev-server`). |

## Testing

```bash
make test           # Go tests + Vitest
make lint           # go vet + Biome
npm run typecheck   # TypeScript
```

