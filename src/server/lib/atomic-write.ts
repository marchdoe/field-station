import { randomBytes } from "node:crypto";
import { renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function writeFileAtomic(
  filePath: string,
  content: string,
  encoding: BufferEncoding = "utf-8",
): void {
  const dir = dirname(filePath);
  const tmpPath = join(dir, `.tmp-${randomBytes(6).toString("hex")}`);
  try {
    writeFileSync(tmpPath, content, encoding);
    renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {}
    throw err;
  }
}
