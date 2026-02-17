import { createServerFn } from "@tanstack/react-start";
import { encodePath, getPluginDisplayName, getProjectName } from "@/lib/utils.js";
import type { JsonObject, JsonValue, SearchResult } from "@/types/config.js";
import { listAgents } from "./agents.js";
import { listCommands } from "./commands.js";
import { getGlobalSettings } from "./config.js";
import { getFeatures } from "./features.js";
import { listHookScripts } from "./hooks.js";
import { getInstalledPlugins } from "./plugins.js";
import { getRegisteredProjects, scanForProjects } from "./projects.js";
import { listSkills } from "./skills.js";

function flattenKeys(obj: JsonObject, prefix = ""): { key: string; value: string }[] {
  const entries: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      entries.push(...flattenKeys(v as JsonObject, fullKey));
    } else {
      entries.push({ key: fullKey, value: formatValue(v) });
    }
  }
  return entries;
}

function formatValue(v: JsonValue): string {
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export const searchAll = createServerFn({ method: "GET" }).handler(
  async (): Promise<SearchResult[]> => {
    const [
      globalAgents,
      globalCommandsResult,
      globalSkills,
      featuresData,
      plugins,
      hookScripts,
      globalSettings,
      registeredProjects,
      scannedProjects,
    ] = await Promise.all([
      listAgents({ data: { scope: "global" } }),
      listCommands({ data: { scope: "global" } }),
      listSkills({ data: { scope: "global" } }),
      getFeatures(),
      getInstalledPlugins(),
      listHookScripts(),
      getGlobalSettings(),
      getRegisteredProjects(),
      scanForProjects(),
    ]);

    const results: SearchResult[] = [];

    // Global agents
    for (const agent of globalAgents) {
      const name = agent.fileName.replace(".md", "");
      results.push({
        type: "agent",
        scope: "global",
        title: agent.name,
        description: agent.description || undefined,
        matchText: [agent.name, agent.description, agent.bodyPreview].join(" ").toLowerCase(),
        href: `/global/agents/${name}`,
        icon: "Bot",
      });
    }

    // Global commands
    for (const cmd of globalCommandsResult.commands) {
      results.push({
        type: "command",
        scope: "global",
        title: `/${cmd.folder}:${cmd.name}`,
        description: cmd.bodyPreview,
        matchText: [cmd.folder, cmd.name, cmd.bodyPreview].join(" ").toLowerCase(),
        href: `/global/commands/${cmd.folder}/${cmd.name}`,
        icon: "Terminal",
      });
    }

    // Global skills
    for (const skill of globalSkills) {
      results.push({
        type: "skill",
        scope: "global",
        title: skill.name,
        description: skill.description || undefined,
        matchText: [skill.name, skill.description, skill.bodyPreview].join(" ").toLowerCase(),
        href: `/global/skills/${skill.folderName}`,
        icon: "Zap",
      });
    }

    // Features
    for (const feature of featuresData.features) {
      results.push({
        type: "feature",
        scope: "global",
        title: feature.definition.name,
        description: feature.definition.description || undefined,
        matchText: [feature.definition.name, feature.definition.description, feature.definition.key]
          .join(" ")
          .toLowerCase(),
        href: "/global/features",
        icon: "Sparkles",
      });
    }

    // Plugins
    for (const plugin of plugins) {
      const displayName = getPluginDisplayName(plugin.id);
      results.push({
        type: "plugin",
        scope: "global",
        title: displayName,
        description: plugin.enabled ? "Enabled" : "Disabled",
        matchText: [displayName, plugin.id, plugin.version].join(" ").toLowerCase(),
        href: "/global/plugins",
        icon: "Puzzle",
      });
    }

    // Hook scripts
    for (const hook of hookScripts) {
      results.push({
        type: "hook",
        scope: "global",
        title: hook.fileName,
        matchText: hook.fileName.toLowerCase(),
        href: "/global/hooks",
        icon: "Webhook",
      });
    }

    // Settings keys
    if (globalSettings.content) {
      const keys = flattenKeys(globalSettings.content);
      for (const entry of keys) {
        results.push({
          type: "settings-key",
          scope: "global",
          title: entry.key,
          description: entry.value,
          matchText: [entry.key, entry.value].join(" ").toLowerCase(),
          href: "/global/settings",
          icon: "Settings",
        });
      }
    }

    // Collect all unique project paths from registered projects and scanned projects
    const projectPaths = new Set<string>();
    for (const p of registeredProjects) {
      projectPaths.add(p);
    }
    for (const p of scannedProjects) {
      if (p.exists) {
        projectPaths.add(p.decodedPath);
      }
    }

    // Fetch project-scoped resources in parallel
    const projectPromises = [...projectPaths].map(async (projectPath) => {
      const encodedPath = encodePath(projectPath);
      const projectName = getProjectName(projectPath);

      const [projectAgents, projectCommandsResult, projectSkills] = await Promise.all([
        listAgents({ data: { scope: "project", projectPath } }),
        listCommands({ data: { scope: "project", projectPath } }),
        listSkills({ data: { scope: "project", projectPath } }),
      ]);

      const projectResults: SearchResult[] = [];

      for (const agent of projectAgents) {
        const name = agent.fileName.replace(".md", "");
        projectResults.push({
          type: "agent",
          scope: "project",
          projectPath,
          projectName,
          title: agent.name,
          description: agent.description || undefined,
          matchText: [agent.name, agent.description, agent.bodyPreview, projectName]
            .join(" ")
            .toLowerCase(),
          href: `/projects/${encodedPath}/agents/${name}`,
          icon: "Bot",
        });
      }

      for (const cmd of projectCommandsResult.commands) {
        projectResults.push({
          type: "command",
          scope: "project",
          projectPath,
          projectName,
          title: `/${cmd.folder}:${cmd.name}`,
          description: cmd.bodyPreview,
          matchText: [cmd.folder, cmd.name, cmd.bodyPreview, projectName].join(" ").toLowerCase(),
          href: `/projects/${encodedPath}/commands/${cmd.folder}/${cmd.name}`,
          icon: "Terminal",
        });
      }

      for (const skill of projectSkills) {
        projectResults.push({
          type: "skill",
          scope: "project",
          projectPath,
          projectName,
          title: skill.name,
          description: skill.description || undefined,
          matchText: [skill.name, skill.description, skill.bodyPreview, projectName]
            .join(" ")
            .toLowerCase(),
          href: `/projects/${encodedPath}/skills/${skill.folderName}`,
          icon: "Zap",
        });
      }

      return projectResults;
    });

    const projectResultArrays = await Promise.all(projectPromises);
    for (const arr of projectResultArrays) {
      results.push(...arr);
    }

    return results;
  },
);
