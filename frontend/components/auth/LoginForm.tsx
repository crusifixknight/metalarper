"use client";

import { useActionState, useEffect, useState } from "react";

import { loginAction } from "@/app/actions/auth";
import { EMPTY_AUTH_FORM_STATE } from "@/lib/auth-errors";

const controlClassName =
  "w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900";

const labelClassName =
  "mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200";

const errorClassName = "mt-1 text-xs text-red-600 dark:text-red-400";

type LoginFormProps = {
  /** Called after a successful login so the panel can close itself. */
  onSuccess: () => void;
  /** Switches the panel to the registration form. */
  onSwitchToRegister: () => void;
};

export default function LoginForm({
  onSuccess,
  onSwitchToRegister,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    EMPTY_AUTH_FORM_STATE,
  );
  // Controlled inputs keep their values when the action returns an error:
  // React resets uncontrolled forms after every submission.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
    }
  }, [state.status, onSuccess]);

  return (
    <form action={formAction} className="space-y-3">
      {state.formError && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.formError}
        </p>
      )}

      <div>
        <label htmlFor="login-username" className={labelClassName}>
          Имя пользователя
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors.username)}
          aria-describedby={
            state.fieldErrors.username ? "login-username-error" : undefined
          }
          className={controlClassName}
        />
        {state.fieldErrors.username && (
          <p id="login-username-error" className={errorClassName}>
            {state.fieldErrors.username}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="login-password" className={labelClassName}>
          Пароль
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors.password)}
          aria-describedby={
            state.fieldErrors.password ? "login-password-error" : undefined
          }
          className={controlClassName}
        />
        {state.fieldErrors.password && (
          <p id="login-password-error" className={errorClassName}>
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Входим…" : "Войти"}
      </button>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Нет аккаунта?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Зарегистрироваться
        </button>
      </p>
    </form>
  );
}
