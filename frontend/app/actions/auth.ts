"use server";

import { revalidatePath } from "next/cache";

import { login, register } from "@/lib/auth-api";
import { describeAuthError, type AuthFormState } from "@/lib/auth-errors";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

/**
 * Logs a user in: validates the form, calls the Django API and stores the
 * issued tokens in HttpOnly cookies. Never returns tokens to the browser.
 */
export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};

  if (!username) {
    fieldErrors.username = "Введите имя пользователя.";
  }

  if (!password) {
    fieldErrors.password = "Введите пароль.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  try {
    const session = await login(username, password);
    await setSessionCookies(session);
  } catch (error) {
    return describeAuthError(error, "login");
  }

  revalidatePath("/", "layout");
  return { status: "success", fieldErrors: {} };
}

/** Ends the session by deleting the auth cookies. */
export async function logoutAction(): Promise<void> {
  await clearSessionCookies();
  revalidatePath("/", "layout");
}

/**
 * Registers a user and signs them in right away: the API returns tokens, so
 * the new account does not have to log in again.
 */
export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  const fieldErrors: Record<string, string> = {};

  if (!username) {
    fieldErrors.username = "Введите имя пользователя.";
  }

  if (!email) {
    fieldErrors.email = "Введите email.";
  }

  if (!password) {
    fieldErrors.password = "Введите пароль.";
  }

  if (!passwordConfirm) {
    fieldErrors.password_confirm = "Повторите пароль.";
  } else if (password && password !== passwordConfirm) {
    fieldErrors.password_confirm = "Пароли не совпадают.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  try {
    const session = await register({
      username,
      email,
      password,
      password_confirm: passwordConfirm,
    });
    await setSessionCookies(session);
  } catch (error) {
    return describeAuthError(error, "register");
  }

  revalidatePath("/", "layout");
  return { status: "success", fieldErrors: {} };
}
