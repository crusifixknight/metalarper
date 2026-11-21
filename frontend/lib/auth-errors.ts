import { AuthApiError } from "./auth-api";

/** Result of an auth Server Action, consumed by `useActionState`. */
export type AuthFormState = {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors: Record<string, string>;
};

export const EMPTY_AUTH_FORM_STATE: AuthFormState = {
  status: "idle",
  fieldErrors: {},
};

const NETWORK_ERROR =
  "Не удалось подключиться к серверу. Проверьте, что бэкенд запущен, и повторите попытку.";

const UNKNOWN_ERROR = "Не удалось выполнить запрос. Попробуйте ещё раз.";

const INVALID_CREDENTIALS = "Неверное имя пользователя или пароль.";

const FIELD_MESSAGE_FALLBACK = "Некорректное значение.";

/**
 * Django ships English validation messages while the UI is Russian. Known
 * messages are translated; unknown ones get a neutral Russian fallback so the
 * interface never mixes languages.
 */
const MESSAGE_TRANSLATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/this password is too short/i, "Пароль слишком короткий."],
  [/this password is too common/i, "Пароль слишком простой."],
  [
    /this password is entirely numeric/i,
    "Пароль не может состоять только из цифр.",
  ],
  [
    /too similar to the (username|email)/i,
    "Пароль слишком похож на имя пользователя или email.",
  ],
  [
    /a user with that username already exists/i,
    "Пользователь с таким именем уже существует.",
  ],
  [
    /a user with that email already exists/i,
    "Пользователь с таким email уже существует.",
  ],
  [/enter a valid email address/i, "Введите корректный email."],
  [
    /enter a valid username/i,
    "Имя пользователя может содержать только буквы, цифры и символы @/./+/-/_.",
  ],
  [/passwords do not match/i, "Пароли не совпадают."],
  [/this field is required/i, "Обязательное поле."],
  [/this field may not be blank/i, "Обязательное поле."],
  [
    /ensure this field has no more than \d+ characters/i,
    "Слишком длинное значение.",
  ],
];

function translateMessage(message: string): string {
  for (const [pattern, translation] of MESSAGE_TRANSLATIONS) {
    if (pattern.test(message)) {
      return translation;
    }
  }

  return FIELD_MESSAGE_FALLBACK;
}

function firstMessage(messages: string[]): string | undefined {
  return messages.length > 0 ? translateMessage(messages[0]) : undefined;
}

/** Converts an auth API failure into Russian text for the form. */
export function describeAuthError(
  error: unknown,
  mode: "login" | "register",
): AuthFormState {
  if (!(error instanceof AuthApiError)) {
    return { status: "error", formError: UNKNOWN_ERROR, fieldErrors: {} };
  }

  if (error.status === 0) {
    return { status: "error", formError: NETWORK_ERROR, fieldErrors: {} };
  }

  const fieldErrors: Record<string, string> = {};

  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const message = firstMessage(messages);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  // Errors that belong to the whole form rather than to a single field.
  const formLevelError =
    fieldErrors.non_field_errors ?? fieldErrors.__all__ ?? undefined;

  delete fieldErrors.non_field_errors;
  delete fieldErrors.__all__;

  if (formLevelError) {
    return { status: "error", formError: formLevelError, fieldErrors };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  if (
    mode === "login" &&
    (error.status === 401 || error.code === "invalid_credentials")
  ) {
    return { status: "error", formError: INVALID_CREDENTIALS, fieldErrors: {} };
  }

  return { status: "error", formError: UNKNOWN_ERROR, fieldErrors: {} };
}
