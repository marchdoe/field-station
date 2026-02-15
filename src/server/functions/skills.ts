import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SkillDetail, SkillFile } from "@/types/config.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { parseMarkdownFrontmatter, truncateBody } from "../lib/markdown-parser.js";
import { isUserOwned } from "../lib/ownership.js";
import { redactSensitiveValues } from "../lib/redact.js";
import { scopeInput } from "../lib/validation.js";

function readSkillsFromDir(dir: string): SkillFile[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir);
  const skills: SkillFile[] = [];

  for (const entry of entries) {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      const skillMdPath = join(entryPath, "SKILL.md");
      if (existsSync(skillMdPath)) {
        const content = readFileSync(skillMdPath, "utf-8");
        const { frontmatter, body } = parseMarkdownFrontmatter(content);

        skills.push({
          name: (frontmatter.name as string) || entry,
          description: (frontmatter.description as string) || "",
          folderName: entry,
          filePath: skillMdPath,
          allowedTools: frontmatter["allowed-tools"] as string | undefined,
          bodyPreview: truncateBody(body),
          isEditable: isUserOwned(skillMdPath),
        });
      }
    }
  }

  return skills;
}

const getSkillInput = z.object({
  scope: z.enum(["global", "project"]),
  projectPath: z.string().optional(),
  folderName: z.string().min(1),
});

export const getSkill = createServerFn({ method: "GET" })
  .inputValidator(getSkillInput)
  .handler(async ({ data }): Promise<SkillDetail> => {
    let dir: string;
    if (data.scope === "global") {
      dir = join(resolveClaudeHome(), "skills");
    } else if (data.projectPath) {
      dir = join(data.projectPath, ".claude", "skills");
    } else {
      throw new Error("projectPath required for project scope");
    }

    const filePath = join(dir, data.folderName, "SKILL.md");
    if (!existsSync(filePath)) {
      throw new Error(`Skill not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseMarkdownFrontmatter(content);

    return redactSensitiveValues({
      name: (frontmatter.name as string) || data.folderName,
      description: (frontmatter.description as string) || "",
      folderName: data.folderName,
      filePath,
      allowedTools: frontmatter["allowed-tools"] as string | undefined,
      body,
      isEditable: isUserOwned(filePath),
    });
  });

export const listSkills = createServerFn({ method: "GET" })
  .inputValidator(scopeInput)
  .handler(async ({ data }): Promise<SkillFile[]> => {
    let dir: string;
    if (data.scope === "global") {
      dir = join(resolveClaudeHome(), "skills");
    } else if (data.projectPath) {
      dir = join(data.projectPath, ".claude", "skills");
    } else {
      return [];
    }
    return redactSensitiveValues(readSkillsFromDir(dir));
  });
