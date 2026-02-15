import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import type { ClaudeSettings, HookScript } from "@/types/config.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { redactSensitiveValues } from "../lib/redact.js";

export const listHookScripts = createServerFn({ method: "GET" }).handler(
  async (): Promise<HookScript[]> => {
    const dir = join(resolveClaudeHome(), "hooks");
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
    return files.map((fileName) => {
      const filePath = join(dir, fileName);
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const preview = lines.length > 15 ? `${lines.slice(0, 15).join("\n")}\n...` : content;

      return {
        fileName,
        filePath,
        contentPreview: redactSensitiveValues(preview),
      };
    });
  },
);

export const getHookConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClaudeSettings["hooks"] | null> => {
    const filePath = join(resolveClaudeHome(), "settings.json");
    if (!existsSync(filePath)) return null;

    try {
      const content = JSON.parse(readFileSync(filePath, "utf-8")) as ClaudeSettings;
      if (!content.hooks) return null;
      return redactSensitiveValues(content.hooks);
    } catch {
      return null;
    }
  },
);
