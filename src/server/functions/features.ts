import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import type { JsonObject } from "@/types/config.js";
import { scanClaudeBinary } from "../lib/claude-binary.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { readJsonFileSafe } from "../lib/config-writer.js";
import type { FeatureCategory, FeatureDefinition } from "../lib/feature-registry.js";
import { getRegistryByKey } from "../lib/feature-registry.js";

export interface Feature {
  definition: FeatureDefinition;
  currentValue: string | boolean | number | null;
  isDocumented: boolean;
}

export interface FeaturesData {
  version: string | null;
  features: Feature[];
  totalDiscovered: number;
  totalDocumented: number;
}

function getCurrentValue(
  key: string,
  type: "env" | "setting",
  settings: JsonObject,
): string | boolean | number | null {
  if (type === "env") {
    const env = settings.env as JsonObject | undefined;
    if (!env) return null;
    const val = env[key];
    return val !== undefined ? (val as string | boolean | number) : null;
  }
  // Setting type — handle dot-path for nested keys like "sandbox.enabled"
  const parts = key.split(".");
  let current: unknown = settings;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return null;
    current = (current as JsonObject)[part];
  }
  return current !== undefined ? (current as string | boolean | number) : null;
}

export const getFeatures = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturesData> => {
    const scan = scanClaudeBinary();
    const registry = getRegistryByKey();
    const claudeHome = resolveClaudeHome();
    const settings = readJsonFileSafe(join(claudeHome, "settings.json"));

    const features: Feature[] = [];
    const seen = new Set<string>();

    // Add all registry entries first (documented features)
    for (const [key, def] of registry) {
      seen.add(key);
      features.push({
        definition: def,
        currentValue: getCurrentValue(key, def.type, settings),
        isDocumented: true,
      });
    }

    // Add discovered env vars not in registry
    for (const envVar of scan.envVars) {
      if (seen.has(envVar)) continue;
      seen.add(envVar);
      features.push({
        definition: {
          key: envVar,
          type: "env",
          name: envVar,
          description: "",
          category: "undocumented" as FeatureCategory,
          valueType: "boolean",
        },
        currentValue: getCurrentValue(envVar, "env", settings),
        isDocumented: false,
      });
    }

    return {
      version: scan.version,
      features,
      totalDiscovered: scan.envVars.length,
      totalDocumented: registry.size,
    };
  },
);
