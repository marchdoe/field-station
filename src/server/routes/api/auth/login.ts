import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  defineEventHandler,
  deleteCookie,
  getHeader,
  getQuery,
  readBody,
  sendRedirect,
  setCookie,
  setResponseStatus,
} from "h3";
import { createSession } from "../../../lib/auth-session.js";
import { isSafePath } from "../../../lib/safe-redirect.js";

const COOKIE_NAME = "field-station-session";

function isHttps(event: Parameters<typeof getHeader>[0]): boolean {
  const proto = getHeader(event, "x-forwarded-proto");
  return proto === "https";
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "POST") {
    const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>;

    // Logout: POST with { action: "logout" }
    if (body.action === "logout") {
      deleteCookie(event, COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "strict" });
      return sendRedirect(event, "/login", 302);
    }

    // Login: POST with { token }
    const submitted = typeof body.token === "string" ? body.token : "";
    const configured = process.env.FIELD_STATION_AUTH_TOKEN ?? "";

    if (!configured) {
      // Auth disabled — no login needed
      return sendRedirect(event, "/", 302);
    }

    // Timing jitter to make brute-force slightly harder
    await new Promise((r) => setTimeout(r, randomBytes(1).readUInt8(0)));

    if (!safeCompare(submitted, configured)) {
      setResponseStatus(event, 401);
      return { error: "Invalid token" };
    }

    const session = createSession(configured);
    const secure = isHttps(event);

    setCookie(event, COOKIE_NAME, session, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      // No maxAge = session cookie (expires when browser closes)
    });

    const query = getQuery(event);
    // getQuery already URL-decodes values
    const rawNext = typeof query.next === "string" ? query.next : null;
    const next = rawNext !== null && isSafePath(rawNext) ? rawNext : "/";
    return sendRedirect(event, next, 302);
  }

  setResponseStatus(event, 405);
  return { error: "Method not allowed" };
});
