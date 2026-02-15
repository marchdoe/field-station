import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import type { ClaudeSettings, PluginInfo } from "@/types/config.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { redactSensitiveValues } from "../lib/redact.js";

interface PluginInstallRecord {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha: string;
}

interface PluginManifest {
  homepage?: string;
  repository?: string;
}

interface InstalledPluginsFile {
  version: number;
  plugins: Record<string, PluginInstallRecord[]>;
}

export const getInstalledPlugins = createServerFn({ method: "GET" }).handler(
  async (): Promise<PluginInfo[]> => {
    const claudeHome = resolveClaudeHome();
    const pluginsPath = join(claudeHome, "plugins", "installed_plugins.json");
    const settingsPath = join(claudeHome, "settings.json");

    if (!existsSync(pluginsPath)) return [];

    let enabledMap: Record<string, boolean> = {};
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as ClaudeSettings;
        enabledMap = settings.enabledPlugins ?? {};
      } catch {
        // ignore
      }
    }

    try {
      const data = JSON.parse(readFileSync(pluginsPath, "utf-8")) as InstalledPluginsFile;
      const plugins: PluginInfo[] = [];

      for (const [id, records] of Object.entries(data.plugins)) {
        const record = records[0];
        if (!record) continue;

        let homepage: string | undefined;
        let repository: string | undefined;
        const manifestPath = join(record.installPath, ".claude-plugin", "plugin.json");
        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as PluginManifest;
            homepage = manifest.homepage;
            repository = manifest.repository;
          } catch {
            // ignore
          }
        }

        plugins.push({
          id,
          scope: record.scope,
          installPath: record.installPath,
          version: record.version,
          installedAt: record.installedAt,
          lastUpdated: record.lastUpdated,
          gitCommitSha: record.gitCommitSha,
          enabled: enabledMap[id] ?? false,
          homepage,
          repository,
        });
      }

      return redactSensitiveValues(plugins);
    } catch {
      return [];
    }
  },
);
