"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

type AuthMode = "login" | "register";

/**
 * Auth entry point in the site header.
 *
 * The button opens a panel with the login form; the form itself links to the
 * registration form, and the panel switches between the two without a page
 * reload.
 */
export default function AuthMenu() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const showLogin = useCallback(() => setMode("login"), []);
  const showRegister = useCallback(() => setMode("register"), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }

    // Every new visit starts from the login form.
    setMode("login");
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls="auth-panel"
        aria-haspopup="dialog"
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Войти
      </button>

      {open && (
        <div
          id="auth-panel"
          role="dialog"
          aria-label={mode === "login" ? "Вход в аккаунт" : "Регистрация"}
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <h3 className="mb-3 text-base font-bold">
            {mode === "login" ? "Вход" : "Регистрация"}
          </h3>

          {mode === "login" ? (
            <LoginForm
              onSuccess={close}
              onSwitchToRegister={showRegister}
            />
          ) : (
            <RegisterForm onSuccess={close} onSwitchToLogin={showLogin} />
          )}
        </div>
      )}
    </div>
  );
}
