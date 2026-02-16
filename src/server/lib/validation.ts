import { resolve } from "node:path";
import { z } from "zod";

export const scopeSchema = z.enum(["global", "project"]);

export const projectPathSchema = z
  .string()
  .min(1)
  .refine((val) => val.startsWith("/"), {
    message: "Project path must be absolute",
  })
  .transform((val) => resolve(val));

export const encodedPathSchema = z.string().min(1);

export const scopeInput = z.object({
  scope: scopeSchema,
  projectPath: projectPathSchema.optional(),
});

export const projectPathInput = z.object({
  projectPath: projectPathSchema,
});
