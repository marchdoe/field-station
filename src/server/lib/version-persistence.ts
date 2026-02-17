import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write.js";

const VERSION_FILE_NAME = "claude-version.json";

export function readPersistedVersion(dataDir: string): string | null {
  const filePath = join(dataDir, VERSION_FILE_NAME);
  if (!existsSync(filePath)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
    if (
      typeof raw === "object" &&
      raw !== null &&
      "version" in raw &&
      typeof (raw as Record<string, unknown>).version === "string"
    ) {
      return (raw as Record<string, unknown>).version as string;
    }
    return null;
  } catch {
    return null;
  }
}

export function writePersistedVersion(dataDir: string, version: string | null): void {
  const filePath = join(dataDir, VERSION_FILE_NAME);
  writeFileAtomic(filePath, `${JSON.stringify({ version }, null, 2)}\n`);
}
