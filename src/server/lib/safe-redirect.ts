/**
 * Returns true if `value` is a path-only URL (no protocol or host).
 * Use this before redirecting to a user-supplied destination to prevent open redirects.
 */
export function isSafePath(value: string): boolean {
  if (value.startsWith("\\")) return false; // backslash prefix is not a safe path
  try {
    const parsed = new URL(value, "http://x");
    return parsed.origin === "http://x";
  } catch {
    return false;
  }
}
