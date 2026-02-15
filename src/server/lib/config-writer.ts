import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ConfigLayerSource, JsonObject, JsonValue } from "@/types/config.js";
import { resolveClaudeHome } from "./claude-home.js";
import { deleteAtPath, getAtPath, setAtPath } from "./json-path.js";

export function readJsonFileSafe(filePath: string): JsonObject {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as JsonObject;
  } catch {
    return {};
  }
}

export function writeJsonFileSafe(filePath: string, data: JsonObject): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export function resolveLayerPath(layer: ConfigLayerSource, projectPath?: string): string {
  const claudeHome = resolveClaudeHome();
  switch (layer) {
    case "global":
      return join(claudeHome, "settings.json");
    case "global-local":
      return join(claudeHome, "settings.local.json");
    case "project":
      if (!projectPath) throw new Error("projectPath required for project layer");
      return join(projectPath, ".claude", "settings.json");
    case "project-local":
      if (!projectPath) throw new Error("projectPath required for project-local layer");
      return join(projectPath, ".claude", "settings.local.json");
  }
}

export function applyUpdateSetting(filePath: string, keyPath: string, value: JsonValue): void {
  const current = readJsonFileSafe(filePath);
  const updated = setAtPath(current, keyPath, value);
  writeJsonFileSafe(filePath, updated);
}

export function applyDeleteSetting(filePath: string, keyPath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const current = readJsonFileSafe(filePath);
  const updated = deleteAtPath(current, keyPath);
  writeJsonFileSafe(filePath, updated);
}

export function applyMoveSetting(fromPath: string, toPath: string, keyPath: string): void {
  const fromData = readJsonFileSafe(fromPath);
  const value = getAtPath(fromData, keyPath);
  if (value === undefined) {
    throw new Error(`Key "${keyPath}" not found in source file`);
  }
  const toData = readJsonFileSafe(toPath);
  writeJsonFileSafe(toPath, setAtPath(toData, keyPath, value));
  writeJsonFileSafe(fromPath, deleteAtPath(fromData, keyPath));
}
