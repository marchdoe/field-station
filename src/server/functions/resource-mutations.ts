import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveClaudeHome } from "../lib/claude-home.js";
import {
  createResourceFile,
  deleteResourceFile,
  resolveResourcePath,
  updateResourceFile,
} from "../lib/resource-writer.js";
import { assertSafePath, getAllowedRoots } from "../lib/safe-path.js";
import { projectPathSchema } from "../lib/validation.js";

const DATA_FILE = join(process.cwd(), "data", "projects.json");

const resourceTypeSchema = z.enum(["agent", "command", "skill"]);

const createResourceInput = z.object({
  scope: z.enum(["global", "project"]),
  type: resourceTypeSchema,
  name: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Name must be alphanumeric with hyphens/underscores",
    ),
  folder: z.string().optional(),
  projectPath: projectPathSchema.optional(),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  body: z.string().default(""),
});

export const createResource = createServerFn({ method: "POST" })
  .inputValidator(createResourceInput)
  .handler(async ({ data }) => {
    const baseDir =
      data.scope === "global"
        ? resolveClaudeHome()
        : join(data.projectPath!, ".claude");
    const filePath = resolveResourcePath(
      baseDir,
      data.type,
      data.name,
      data.folder,
    );
    createResourceFile(filePath, data.frontmatter, data.body);
    return { success: true, filePath };
  });

const updateResourceInput = z.object({
  filePath: z.string().min(1),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  body: z.string().default(""),
});

export const updateResource = createServerFn({ method: "POST" })
  .inputValidator(updateResourceInput)
  .handler(async ({ data }) => {
    assertSafePath(data.filePath, getAllowedRoots(DATA_FILE));
    updateResourceFile(data.filePath, data.frontmatter, data.body);
    return { success: true };
  });

const deleteResourceInput = z.object({
  filePath: z.string().min(1),
});

export const deleteResource = createServerFn({ method: "POST" })
  .inputValidator(deleteResourceInput)
  .handler(async ({ data }) => {
    assertSafePath(data.filePath, getAllowedRoots(DATA_FILE));
    deleteResourceFile(data.filePath);
    return { success: true };
  });
