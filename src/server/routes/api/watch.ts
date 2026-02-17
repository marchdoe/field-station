import type { FSWatcher } from "node:fs";
import { existsSync, readFileSync, watch } from "node:fs";
import { join, resolve } from "node:path";
import { createEventStream, defineEventHandler } from "h3";
import { resolveClaudeHome } from "../../lib/claude-home.js";

const DATA_FILE = join(process.cwd(), "data", "projects.json");

type ChangeListener = () => void;

const listeners = new Set<ChangeListener>();
let watchers: FSWatcher[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function getProjectDirs(): string[] {
  if (!existsSync(DATA_FILE)) return [];
  try {
    const raw: unknown = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    const paths = Array.isArray(raw) ? (raw as unknown[]) : [];
    return paths
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .map((p) => join(resolve(p), ".claude"))
      .filter((p) => existsSync(p));
  } catch {
    return [];
  }
}

function notifyAll() {
  for (const listener of listeners) {
    listener();
  }
}

function startWatching() {
  const claudeHome = resolveClaudeHome();
  const dirsToWatch = [claudeHome, ...getProjectDirs()];

  for (const dir of dirsToWatch) {
    if (!existsSync(dir)) continue;
    try {
      const watcher = watch(dir, { recursive: true }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(notifyAll, 300);
      });
      watchers.push(watcher);
    } catch {
      // skip dirs that can't be watched
    }
  }
}

function stopWatching() {
  for (const w of watchers) {
    w.close();
  }
  watchers = [];
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);

  const onChange: ChangeListener = () => {
    try {
      eventStream.push({ event: "change", data: "{}" });
    } catch {
      // stream already closed
    }
  };

  listeners.add(onChange);
  if (listeners.size === 1) {
    startWatching();
  }

  const heartbeat = setInterval(() => {
    eventStream.push({ event: "heartbeat", data: "{}" });
  }, 30_000);

  eventStream.onClosed(() => {
    listeners.delete(onChange);
    clearInterval(heartbeat);
    if (listeners.size === 0) {
      stopWatching();
    }
  });

  return eventStream.send();
});
