import { cookies } from "next/headers";

import type { AuthSession, AuthUser } from "./auth-api";

export const ACCESS_COOKIE = "ml_access";
export const REFRESH_COOKIE = "ml_refresh";
export const USER_COOKIE = "ml_user";

/** Access tokens live 30 minutes; refresh tokens live 1 day (see SIMPLE_JWT). */
const ACCESS_MAX_AGE = 30 * 60;
const REFRESH_MAX_AGE = 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Stores the issued tokens and the display user in HttpOnly cookies.
 * Must be called from a Server Action or a Route Handler.
 */
export async function setSessionCookies(session: AuthSession): Promise<void> {
  const store = await cookies();

  store.set(ACCESS_COOKIE, session.access, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, session.refresh, cookieOptions(REFRESH_MAX_AGE));
  store.set(USER_COOKIE, JSON.stringify(session.user), cookieOptions(REFRESH_MAX_AGE));
}

/** Removes the whole session. Must be called from a Server Action. */
export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();

  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(USER_COOKIE);
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "number" &&
    typeof record.username === "string" &&
    typeof record.email === "string"
  );
}

/**
 * Reads the current user from the session cookie.
 *
 * The payload is only used to render the header; no server data depends on it.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAuthUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
