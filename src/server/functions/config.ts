import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import type { ConfigLayer, EffectiveConfig } from "@/types/config.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { getConfigLayer, mergeConfigLayers } from "../lib/config-parser.js";
import { redactSensitiveValues } from "../lib/redact.js";
import { projectPathInput } from "../lib/validation.js";

export const getGlobalSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigLayer> => {
    const claudeHome = resolveClaudeHome();
    const layer = getConfigLayer(join(claudeHome, "settings.json"), "global");
    return redactSensitiveValues(layer);
  },
);

export const getGlobalSettingsLocal = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigLayer> => {
    const claudeHome = resolveClaudeHome();
    const layer = getConfigLayer(join(claudeHome, "settings.local.json"), "global-local");
    return redactSensitiveValues(layer);
  },
);

export const getProjectSettings = createServerFn({ method: "GET" })
  .inputValidator(projectPathInput)
  .handler(async ({ data }): Promise<ConfigLayer> => {
    const layer = getConfigLayer(join(data.projectPath, ".claude", "settings.json"), "project");
    return redactSensitiveValues(layer);
  });

export const getProjectSettingsLocal = createServerFn({ method: "GET" })
  .inputValidator(projectPathInput)
  .handler(async ({ data }): Promise<ConfigLayer> => {
    const layer = getConfigLayer(
      join(data.projectPath, ".claude", "settings.local.json"),
      "project-local",
    );
    return redactSensitiveValues(layer);
  });

export const getEffectiveConfig = createServerFn({ method: "GET" })
  .inputValidator(projectPathInput)
  .handler(async ({ data }): Promise<EffectiveConfig> => {
    const config = mergeConfigLayers(data.projectPath);
    return redactSensitiveValues(config);
  });
