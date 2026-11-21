"use client";

import { useActionState, useEffect, useState } from "react";

import { registerAction } from "@/app/actions/auth";
import { EMPTY_AUTH_FORM_STATE } from "@/lib/auth-errors";

const controlClassName =
  "w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900";

const labelClassName =
  "mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200";

const errorClassName = "mt-1 text-xs text-red-600 dark:text-red-400";

type RegisterFormProps = {
  /** Called after a successful registration so the panel can close itself. */
  onSuccess: () => void;
  /** Switches the panel back to the login form. */
  onSwitchToLogin: () => void;
};

export default function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    EMPTY_AUTH_FORM_STATE,
  );
  // Controlled inputs keep their values when the action returns an error:
  // React resets uncontrolled forms after every submission.
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

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
        <label htmlFor="register-username" className={labelClassName}>
          Имя пользователя
        </label>
        <input
          id="register-username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors.username)}
          aria-describedby={
            state.fieldErrors.username ? "register-username-error" : undefined
          }
          className={controlClassName}
        />
        {state.fieldErrors.username && (
          <p id="register-username-error" className={errorClassName}>
            {state.fieldErrors.username}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-email" className={labelClassName}>
          Email
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors.email)}
          aria-describedby={
            state.fieldErrors.email ? "register-email-error" : undefined
          }
          className={controlClassName}
        />
        {state.fieldErrors.email && (
          <p id="register-email-error" className={errorClassName}>
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-password" className={labelClassName}>
          Пароль
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors.password)}
          aria-describedby={
            state.fieldErrors.password ? "register-password-error" : undefined
          }
          className={controlClassName}
        />
        {state.fieldErrors.password && (
          <p id="register-password-error" className={errorClassName}>
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-password-confirm" className={labelClassName}>
          Повторите пароль
        </label>
        <input
          id="register-password-confirm"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors.password_confirm)}
          aria-describedby={
            state.fieldErrors.password_confirm
              ? "register-password-confirm-error"
              : undefined
          }
          className={controlClassName}
        />
        {state.fieldErrors.password_confirm && (
          <p id="register-password-confirm-error" className={errorClassName}>
            {state.fieldErrors.password_confirm}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Создаём аккаунт…" : "Зарегистрироваться"}
      </button>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Уже есть аккаунт?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Войти
        </button>
      </p>
    </form>
  );
}
