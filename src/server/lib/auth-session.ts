import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_ID_BYTES = 16;

function sign(id: string, token: string): string {
  return createHmac("sha256", token).update(id).digest("hex");
}

/** Create a signed session cookie value: `{randomId}.{hmac}` */
export function createSession(token: string): string {
  const id = randomBytes(SESSION_ID_BYTES).toString("hex");
  return `${id}.${sign(id, token)}`;
}

/** Verify a session cookie value against the current token. Constant-time. */
export function verifySession(cookieValue: string, token: string): boolean {
  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1) return false;

  const id = cookieValue.slice(0, dotIndex);
  const givenHmac = cookieValue.slice(dotIndex + 1);
  if (!id || !givenHmac) return false;

  const expectedHmac = sign(id, token);

  try {
    return timingSafeEqual(Buffer.from(givenHmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    // buffers different lengths (malformed hex) → invalid
    return false;
  }
}
