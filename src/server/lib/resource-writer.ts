import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import matter from "gray-matter";
import { isUserOwned } from "./ownership.js";

export type ResourceType = "agent" | "command" | "skill";

export function serializeMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  const keys = Object.keys(frontmatter).filter(
    (k) => frontmatter[k] !== undefined && frontmatter[k] !== "",
  );
  if (keys.length === 0) return body;
  const cleaned: Record<string, unknown> = {};
  for (const k of keys) cleaned[k] = frontmatter[k];
  return matter.stringify(body, cleaned);
}

export function resolveResourcePath(
  baseDir: string,
  type: ResourceType,
  name: string,
  folder?: string,
): string {
  switch (type) {
    case "agent":
      return join(baseDir, "agents", `${name}.md`);
    case "command":
      if (!folder) throw new Error("folder is required for commands");
      return join(baseDir, "commands", folder, `${name}.md`);
    case "skill":
      return join(baseDir, "skills", name, "SKILL.md");
  }
}

export function createResourceFile(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string,
): void {
  if (!isUserOwned(filePath)) {
    throw new Error(`Path is not user-owned: ${filePath}`);
  }
  if (existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}`);
  }
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, serializeMarkdown(frontmatter, body), "utf-8");
}

export function updateResourceFile(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string,
): void {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  if (!isUserOwned(filePath)) {
    throw new Error(`Path is not user-owned: ${filePath}`);
  }
  writeFileSync(filePath, serializeMarkdown(frontmatter, body), "utf-8");
}

export function deleteResourceFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  if (!isUserOwned(filePath)) {
    throw new Error(`Path is not user-owned: ${filePath}`);
  }
  unlinkSync(filePath);
}
