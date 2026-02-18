import {
  defineEventHandler,
  getCookie,
  getHeader,
  getRequestURL,
  sendRedirect,
  setResponseStatus,
} from "h3";
import { verifySession } from "../lib/auth-session.js";

const COOKIE_NAME = "field-station-session";
const LOGIN_PATH = "/login";
const AUTH_API_PREFIX = "/api/auth/";

/** Pure logic — exported for testing */
export function shouldAllow(
  configuredToken: string | undefined,
  cookieValue: string | undefined,
  pathname: string,
): boolean {
  // Auth disabled
  if (!configuredToken) return true;

  // Always allow public paths
  const pathOnly = pathname.split("?")[0] ?? pathname;
  if (pathOnly === LOGIN_PATH || pathOnly.startsWith(AUTH_API_PREFIX)) return true;

  // Check session cookie
  if (!cookieValue) return false;
  return verifySession(cookieValue, configuredToken);
}

export default defineEventHandler(async (event) => {
  const token = process.env.FIELD_STATION_AUTH_TOKEN || undefined;
  const cookieValue = getCookie(event, COOKIE_NAME);
  const url = getRequestURL(event);
  const pathname = url.pathname + (url.search ?? "");

  if (shouldAllow(token, cookieValue, pathname)) return;

  // Determine if browser request (accepts HTML) or API request
  const accept = getHeader(event, "accept") ?? "";
  const isBrowser = accept.includes("text/html");

  if (isBrowser) {
    const next = encodeURIComponent(pathname);
    return sendRedirect(event, `/login?next=${next}`, 302);
  }

  setResponseStatus(event, 401);
  return { error: "Unauthorized" };
});
