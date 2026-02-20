import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_ID_BYTES = 16; // 128-bit random session ID

// token is the HMAC key; id is the message. Do not swap these arguments.
function sign(id: string, token: string): string {
  return createHmac("sha256", token).update(id).digest("hex");
}

/** Create a signed session cookie value: `{randomId}.{hmac}` */
export function createSession(token: string): string {
  const id = randomBytes(SESSION_ID_BYTES).toString("hex");
  return `${id}.${sign(id, token)}`;
}

const LOGIN_PATH = "/login";
const AUTH_API_PREFIX = "/api/auth/";

/** Pure auth gate logic — no framework dependencies. */
export function shouldAllow(
  configuredToken: string | undefined,
  cookieValue: string | undefined,
  pathname: string,
): boolean {
  if (!configuredToken) return true;
  if (pathname === LOGIN_PATH || pathname.startsWith(AUTH_API_PREFIX)) return true;
  if (!cookieValue) return false;
  return verifySession(cookieValue, configuredToken);
}

/** Verify a session cookie value against the current token. Constant-time. */
export function verifySession(cookieValue: string, token: string): boolean {
  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1) return false;

  const id = cookieValue.slice(0, dotIndex);
  const givenHmac = cookieValue.slice(dotIndex + 1);
  if (!id || !givenHmac) return false;

  if (id.length !== SESSION_ID_BYTES * 2 || givenHmac.length !== 64) return false;

  const expectedHmac = sign(id, token);

  try {
    return timingSafeEqual(Buffer.from(givenHmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    // timingSafeEqual throws if buffers are different lengths — shouldn't happen after length check above
    return false;
  }
}
