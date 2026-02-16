import { resolve } from "node:path";

export function assertSafePath(rawPath: string, allowedRoots: string[]): string {
  if (!rawPath) {
    throw new Error("Path must not be empty");
  }

  const resolved = resolve(rawPath);

  const isAllowed = allowedRoots.some((root) => {
    const resolvedRoot = resolve(root);
    return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}/`);
  });

  if (!isAllowed) {
    throw new Error(`Path is outside allowed directories: ${resolved}`);
  }

  return resolved;
}
