/**
 * Server-side client for the Django auth endpoints.
 *
 * The module is used by Server Actions and by `proxy.ts`, so it must not
 * depend on Next.js request APIs. Tokens stay on the server: the browser only
 * receives HttpOnly cookies.
 */

export const API_URL = (
  process.env.API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  access: string;
  refresh: string;
};

/** Field errors in the shape DRF returns them: `{ field: ["message"] }`. */
export type AuthFieldErrors = Record<string, string[]>;

/** Failure returned by the auth API, with the HTTP status and field errors. */
export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: AuthFieldErrors = {},
    readonly code?: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function readDetail(payload: unknown): { detail?: string; code?: string } {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const record = payload as Record<string, unknown>;

  return {
    detail: typeof record.detail === "string" ? record.detail : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

function readFieldErrors(payload: unknown): AuthFieldErrors {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const errors: AuthFieldErrors = {};

  for (const [field, value] of Object.entries(
    payload as Record<string, unknown>,
  )) {
    if (field === "detail" || field === "code") {
      continue;
    }

    if (Array.isArray(value)) {
      const messages = value.filter(
        (item): item is string => typeof item === "string",
      );
      if (messages.length > 0) {
        errors[field] = messages;
      }
    } else if (typeof value === "string" && value) {
      errors[field] = [value];
    }
  }

  return errors;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError(
      0,
      `Не удалось подключиться к API по адресу ${API_URL}`,
    );
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    // The API may return an empty or non-JSON body on some errors.
  }

  if (!response.ok) {
    const { detail, code } = readDetail(payload);

    throw new AuthApiError(
      response.status,
      detail ?? `API вернул ошибку ${response.status}.`,
      readFieldErrors(payload),
      code,
    );
  }

  return payload as T;
}

export function login(username: string, password: string): Promise<AuthSession> {
  return postJson<AuthSession>("/api/auth/login/", { username, password });
}

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
};

export function register(input: RegisterInput): Promise<AuthSession> {
  return postJson<AuthSession>("/api/auth/register/", input);
}

export function refreshSession(refresh: string): Promise<{ access: string }> {
  return postJson<{ access: string }>("/api/auth/refresh/", { refresh });
}
