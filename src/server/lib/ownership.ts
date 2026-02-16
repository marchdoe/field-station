import { join, resolve } from "node:path";
import { resolveClaudeHome } from "./claude-home.js";

export function isUserOwned(filePath: string): boolean {
  const resolved = resolve(filePath);
  const protectedDir = resolve(join(resolveClaudeHome(), "plugins", "cache"));

  return !resolved.startsWith(`${protectedDir}/`) && resolved !== protectedDir;
}
