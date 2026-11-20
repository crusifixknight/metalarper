import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the JWT session alive: when the access token is missing or expired,
 * refreshes it with the refresh token before the page is rendered.
 *
 * Proxy runs in the Node.js runtime by default (Next.js 16).
 */

const API_URL = (
  process.env.API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const ACCESS_COOKIE = "ml_access";
const REFRESH_COOKIE = "ml_refresh";
const USER_COOKIE = "ml_user";

const ACCESS_MAX_AGE = 30 * 60;

const SESSION_COOKIE_NAMES = new Set([
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
]);

/** Refresh a bit early so the next request does not race the backend. */
const EXPIRY_LEEWAY_MS = 30_000;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Reads the JWT `exp` claim without verifying the signature. */
function isAccessTokenFresh(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const payload = token.split(".")[1];

  if (!payload) {
    return false;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };

    return (
      typeof claims.exp === "number" &&
      claims.exp * 1000 > Date.now() + EXPIRY_LEEWAY_MS
    );
  } catch {
    return false;
  }
}

type CookiePair = { name: string; value: string };

function cookieHeader(cookies: CookiePair[]): string {
  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

function requestCookies(request: NextRequest): CookiePair[] {
  return request.cookies
    .getAll()
    .map(({ name, value }) => ({ name, value }));
}

/** Forwards the request with an updated (or added) cookie. */
function headersWithCookie(
  request: NextRequest,
  replacement: CookiePair,
): Headers {
  const headers = new Headers(request.headers);
  const cookies = requestCookies(request);
  const index = cookies.findIndex((cookie) => cookie.name === replacement.name);

  if (index >= 0) {
    cookies[index] = replacement;
  } else {
    cookies.push(replacement);
  }

  headers.set("cookie", cookieHeader(cookies));
  return headers;
}

/** Forwards the request as if the session cookies were already gone. */
function headersWithoutSession(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  const cookies = requestCookies(request).filter(
    ({ name }) => !SESSION_COOKIE_NAMES.has(name),
  );

  if (cookies.length > 0) {
    headers.set("cookie", cookieHeader(cookies));
  } else {
    headers.delete("cookie");
  }

  return headers;
}

export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!refreshToken || isAccessTokenFresh(accessToken)) {
    return NextResponse.next();
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });
  } catch {
    // The backend is unreachable: keep the session and let the page show its
    // own error state instead of logging the user out.
    return NextResponse.next();
  }

  if (!response.ok) {
    // The refresh token expired or was rejected: end the session.
    const next = NextResponse.next({
      request: { headers: headersWithoutSession(request) },
    });

    next.cookies.delete(ACCESS_COOKIE);
    next.cookies.delete(REFRESH_COOKIE);
    next.cookies.delete(USER_COOKIE);

    return next;
  }

  const payload = (await response.json().catch(() => null)) as {
    access?: unknown;
  } | null;

  if (typeof payload?.access !== "string" || !payload.access) {
    return NextResponse.next();
  }

  const next = NextResponse.next({
    request: {
      headers: headersWithCookie(request, {
        name: ACCESS_COOKIE,
        value: payload.access,
      }),
    },
  });

  next.cookies.set(
    ACCESS_COOKIE,
    payload.access,
    cookieOptions(ACCESS_MAX_AGE),
  );

  return next;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
