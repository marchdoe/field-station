import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AgentDetail, AgentFile } from "@/types/config.js";
import { resolveClaudeHome } from "../lib/claude-home.js";
import { parseMarkdownFrontmatter, truncateBody } from "../lib/markdown-parser.js";
import { isUserOwned } from "../lib/ownership.js";
import { redactSensitiveValues } from "../lib/redact.js";
import { scopeInput } from "../lib/validation.js";

function readAgentsFromDir(dir: string): AgentFile[] {
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((fileName) => {
    const filePath = join(dir, fileName);
    const content = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseMarkdownFrontmatter(content);

    return {
      name: (frontmatter.name as string) || fileName.replace(".md", ""),
      description: (frontmatter.description as string) || "",
      fileName,
      filePath,
      tools: frontmatter.tools as string | undefined,
      color: frontmatter.color as string | undefined,
      bodyPreview: truncateBody(body),
      isEditable: isUserOwned(filePath),
    };
  });
}

const getAgentInput = z.object({
  scope: z.enum(["global", "project"]),
  projectPath: z.string().optional(),
  name: z.string().min(1),
});

export const getAgent = createServerFn({ method: "GET" })
  .inputValidator(getAgentInput)
  .handler(async ({ data }): Promise<AgentDetail> => {
    let dir: string;
    if (data.scope === "global") {
      dir = join(resolveClaudeHome(), "agents");
    } else if (data.projectPath) {
      dir = join(data.projectPath, ".claude", "agents");
    } else {
      throw new Error("projectPath required for project scope");
    }

    const filePath = join(dir, `${data.name}.md`);
    if (!existsSync(filePath)) {
      throw new Error(`Agent not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseMarkdownFrontmatter(content);

    return redactSensitiveValues({
      name: (frontmatter.name as string) || data.name,
      description: (frontmatter.description as string) || "",
      fileName: `${data.name}.md`,
      filePath,
      tools: frontmatter.tools as string | undefined,
      color: frontmatter.color as string | undefined,
      body,
      isEditable: isUserOwned(filePath),
    });
  });

export const listAgents = createServerFn({ method: "GET" })
  .inputValidator(scopeInput)
  .handler(async ({ data }): Promise<AgentFile[]> => {
    let dir: string;
    if (data.scope === "global") {
      dir = join(resolveClaudeHome(), "agents");
    } else if (data.projectPath) {
      dir = join(data.projectPath, ".claude", "agents");
    } else {
      return [];
    }
    return redactSensitiveValues(readAgentsFromDir(dir));
  });
