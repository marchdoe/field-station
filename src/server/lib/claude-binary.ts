import { execSync } from "node:child_process";

const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]+$/;

let cachedVersion: string | null = null;
let cachedEnvVars: string[] | null = null;

export function getClaudeVersion(): string | null {
  if (cachedVersion) return cachedVersion;
  try {
    const output = String(
      execSync("claude --version 2>/dev/null", { encoding: "utf-8", timeout: 3000 }),
    ).trim();
    const match = output.match(/^([\d.]+)/);
    if (match) {
      cachedVersion = match[1];
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function locateClaudeBinary(): string | null {
  try {
    const whichOutput = String(execSync("which claude 2>/dev/null", { encoding: "utf-8" })).trim();
    if (!whichOutput) return null;
    try {
      const resolved = String(
        execSync(`realpath "${whichOutput}" 2>/dev/null || readlink "${whichOutput}" 2>/dev/null`, {
          encoding: "utf-8",
        }),
      ).trim();
      return resolved || whichOutput;
    } catch {
      return whichOutput;
    }
  } catch {
    return null;
  }
}

export function scanBinaryForEnvVars(binaryPath: string): string[] {
  try {
    const output = String(
      execSync(`strings "${binaryPath}" | grep -E "^(CLAUDE_CODE_|DISABLE_)[A-Z0-9_]+$"`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      }),
    );
    return [
      ...new Set(
        output
          .trim()
          .split("\n")
          .filter((line) => ENV_VAR_PATTERN.test(line)),
      ),
    ].sort();
  } catch {
    return [];
  }
}

export interface BinaryScanResult {
  version: string | null;
  binaryPath: string | null;
  envVars: string[];
}

export function scanClaudeBinary(): BinaryScanResult {
  const version = getClaudeVersion();

  // Return cache if version matches
  if (version && version === cachedVersion && cachedEnvVars) {
    return { version, binaryPath: locateClaudeBinary(), envVars: cachedEnvVars };
  }

  const binaryPath = locateClaudeBinary();
  const envVars = binaryPath ? scanBinaryForEnvVars(binaryPath) : [];

  // Update cache
  if (version) {
    cachedVersion = version;
    cachedEnvVars = envVars;
  }

  return { version, binaryPath, envVars };
}
