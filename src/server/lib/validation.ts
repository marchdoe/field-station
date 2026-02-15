import { z } from "zod";

export const scopeSchema = z.enum(["global", "project"]);

export const projectPathSchema = z
  .string()
  .min(1)
  .refine((val) => val.startsWith("/"), { message: "Project path must be absolute" });

export const encodedPathSchema = z.string().min(1);

export const scopeInput = z.object({
  scope: scopeSchema,
  projectPath: z.string().optional(),
});

export const projectPathInput = z.object({
  projectPath: z.string().min(1),
});
