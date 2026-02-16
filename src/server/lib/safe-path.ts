import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { decodePath } from "@/lib/utils.js";

import { resolveClaudeHome } from "./claude-home.js";

export function getAllowedRoots(dataFilePath: string): string[] {
  const claudeHome = resolveClaudeHome();
  const roots = new Set<string>([resolve(claudeHome)]);

  // Add registered projects from data/projects.json
  if (existsSync(dataFilePath)) {
    try {
      const paths = JSON.parse(readFileSync(dataFilePath, "utf-8")) as string[];
      for (const p of paths) {
        roots.add(resolve(p));
      }
    } catch {
      // ignore malformed file
    }
  }

  // Add scanned projects from ~/.claude/projects/
  const projectsDir = join(claudeHome, "projects");
  if (existsSync(projectsDir)) {
    try {
      for (const entry of readdirSync(projectsDir)) {
        const entryPath = join(projectsDir, entry);
        if (statSync(entryPath).isDirectory()) {
          roots.add(resolve(decodePath(entry)));
        }
      }
    } catch {
      // ignore read errors
    }
  }

  return [...roots];
}

export function assertSafePath(rawPath: string, allowedRoots: string[]): string {
  if (!rawPath) {
    throw new Error("Path must not be empty");
  }

  const resolved = resolve(rawPath);

  const isAllowed = allowedRoots.some((root) => {
    const resolvedRoot = resolve(root);
    return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}/`);
  });

  if (!isAllowed) {
    throw new Error(`Path is outside allowed directories: ${resolved}`);
  }

  return resolved;
}
