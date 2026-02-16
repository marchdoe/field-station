import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { decodePath } from "@/lib/utils.js";
import type {
  ClaudeSettings,
  GlobalStats,
  JsonObject,
  ProjectInfo,
  ProjectSummary,
} from "@/types/config.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { redactSensitiveValues } from "../lib/redact.js";
import { projectPathInput, projectPathSchema } from "../lib/validation.js";

function countMdFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
  } catch {
    return 0;
  }
}

function countCommandFiles(dir: string): { folders: number; files: number } {
  if (!existsSync(dir)) return { folders: 0, files: 0 };
  try {
    let folders = 0;
    let files = 0;
    for (const entry of readdirSync(dir)) {
      const entryPath = join(dir, entry);
      if (statSync(entryPath).isDirectory()) {
        folders++;
        files += readdirSync(entryPath).filter((f) => f.endsWith(".md")).length;
      }
    }
    return { folders, files };
  } catch {
    return { folders: 0, files: 0 };
  }
}

function countSkillFolders(dir: string): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter((entry) => {
      const entryPath = join(dir, entry);
      return statSync(entryPath).isDirectory() && existsSync(join(entryPath, "SKILL.md"));
    }).length;
  } catch {
    return 0;
  }
}

export const scanForProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectInfo[]> => {
    const projectsDir = join(resolveClaudeHome(), "projects");
    if (!existsSync(projectsDir)) return [];

    const entries = readdirSync(projectsDir);
    const projects: ProjectInfo[] = [];
    const home = homedir();

    for (const encoded of entries) {
      const entryPath = join(projectsDir, encoded);
      if (!statSync(entryPath).isDirectory()) continue;

      const decoded = resolve(decodePath(encoded));

      // Skip if this project's .claude/ is the global config directory
      if (decoded === home) continue;
      const projectExists = existsSync(decoded);
      const claudeDir = join(decoded, ".claude");
      const hasClaudeDir = existsSync(claudeDir);
      const hasClaudeMd =
        existsSync(join(decoded, "CLAUDE.md")) || existsSync(join(decoded, "claude.md"));

      projects.push({
        encodedPath: encoded,
        decodedPath: decoded,
        exists: projectExists,
        hasClaudeDir,
        hasClaudeMd,
        agentCount: countMdFiles(join(claudeDir, "agents")),
        commandCount: countCommandFiles(join(claudeDir, "commands")).files,
        skillCount: countSkillFolders(join(claudeDir, "skills")),
      });
    }

    return projects;
  },
);

export const getProjectSummary = createServerFn({ method: "GET" })
  .inputValidator(projectPathInput)
  .handler(async ({ data }): Promise<ProjectSummary> => {
    const { projectPath } = data;
    const encoded = `-${projectPath.slice(1).replace(/\//g, "-")}`;
    const claudeDir = join(projectPath, ".claude");
    const hasClaudeDir = existsSync(claudeDir);

    let claudeMdPreview = "";
    const claudeMdPath = existsSync(join(projectPath, "CLAUDE.md"))
      ? join(projectPath, "CLAUDE.md")
      : existsSync(join(projectPath, "claude.md"))
        ? join(projectPath, "claude.md")
        : null;

    if (claudeMdPath) {
      const content = readFileSync(claudeMdPath, "utf-8");
      const lines = content.split("\n");
      claudeMdPreview = lines.length > 20 ? `${lines.slice(0, 20).join("\n")}\n...` : content;
    }

    const settingsPath = join(claudeDir, "settings.json");
    const settingsLocalPath = join(claudeDir, "settings.local.json");

    const cmdCounts = countCommandFiles(join(claudeDir, "commands"));

    const summary: ProjectSummary = {
      path: projectPath,
      encodedPath: encoded,
      exists: existsSync(projectPath),
      hasClaudeDir,
      hasClaudeMd: claudeMdPath !== null,
      claudeMdPreview,
      settings: existsSync(settingsPath)
        ? {
            source: "project" as const,
            filePath: settingsPath,
            exists: true,
            content: JSON.parse(readFileSync(settingsPath, "utf-8")) as JsonObject,
          }
        : null,
      settingsLocal: existsSync(settingsLocalPath)
        ? {
            source: "project-local" as const,
            filePath: settingsLocalPath,
            exists: true,
            content: JSON.parse(readFileSync(settingsLocalPath, "utf-8")) as JsonObject,
          }
        : null,
      agentCount: countMdFiles(join(claudeDir, "agents")),
      commandFolderCount: cmdCounts.folders,
      commandCount: cmdCounts.files,
      skillCount: countSkillFolders(join(claudeDir, "skills")),
    };

    return redactSensitiveValues(summary);
  });

export const getGlobalStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<GlobalStats> => {
    const claudeHome = resolveClaudeHome();

    const settingsExists = existsSync(join(claudeHome, "settings.json"));
    const settingsLocalExists = existsSync(join(claudeHome, "settings.local.json"));
    const agentCount = countMdFiles(join(claudeHome, "agents"));
    const cmdCounts = countCommandFiles(join(claudeHome, "commands"));
    const skillCount = countSkillFolders(join(claudeHome, "skills"));

    let hookScriptCount = 0;
    const hooksDir = join(claudeHome, "hooks");
    if (existsSync(hooksDir)) {
      hookScriptCount = readdirSync(hooksDir).filter((f) => f.endsWith(".js")).length;
    }

    let pluginCount = 0;
    let enabledPluginCount = 0;
    const pluginsPath = join(claudeHome, "plugins", "installed_plugins.json");
    if (existsSync(pluginsPath)) {
      try {
        const pData = JSON.parse(readFileSync(pluginsPath, "utf-8"));
        pluginCount = Object.keys(pData.plugins || {}).length;
      } catch {
        // ignore
      }
    }
    if (settingsExists) {
      try {
        const settings = JSON.parse(
          readFileSync(join(claudeHome, "settings.json"), "utf-8"),
        ) as ClaudeSettings;
        if (settings.enabledPlugins) {
          enabledPluginCount = Object.values(settings.enabledPlugins).filter(Boolean).length;
        }
      } catch {
        // ignore
      }
    }

    const projectsDir = join(claudeHome, "projects");
    let projectCount = 0;
    if (existsSync(projectsDir)) {
      projectCount = readdirSync(projectsDir).filter((e) => {
        try {
          return statSync(join(projectsDir, e)).isDirectory();
        } catch {
          return false;
        }
      }).length;
    }

    return {
      settingsExists,
      settingsLocalExists,
      agentCount,
      commandFolderCount: cmdCounts.folders,
      commandCount: cmdCounts.files,
      skillCount,
      hookScriptCount,
      pluginCount,
      enabledPluginCount,
      projectCount,
    };
  },
);

const DATA_FILE = join(process.cwd(), "data", "projects.json");

export const getRegisteredProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    if (!existsSync(DATA_FILE)) return [];
    try {
      return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as string[];
    } catch {
      return [];
    }
  },
);

export const registerProjects = createServerFn({ method: "POST" })
  .inputValidator(z.object({ paths: z.array(projectPathSchema) }))
  .handler(async ({ data }): Promise<string[]> => {
    const dir = join(process.cwd(), "data");
    if (!existsSync(dir)) {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(DATA_FILE, JSON.stringify(data.paths, null, 2));
    return data.paths;
  });
