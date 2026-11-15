/**
 * Тонкий клиент к Django REST API.
 *
 * Запросы выполняются только на сервере (Server Components), поэтому
 * переменная API_URL не нуждается в префиксе NEXT_PUBLIC_ и не попадает
 * в браузерный бандл. Это же избавляет от необходимости настраивать CORS
 * на бэкенде.
 */

export const API_URL = (
  process.env.API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export type Developer = {
  id: number;
  name: string;
  slug: string;
};

export type Genre = {
  id: number;
  name: string;
  slug: string;
};

export type Game = {
  id: number;
  title: string;
  slug: string;
  release_year: number;
  developer: Developer;
  genres: Genre[];
  description: string;
  cover: string | null;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

async function request<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      // Каталог должен показывать актуальные данные при каждом запросе.
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiError(
      0,
      `Не удалось подключиться к API по адресу ${API_URL}`,
      { cause },
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API вернул ошибку ${response.status} для ${path}`,
    );
  }

  return (await response.json()) as T;
}

export function getGames(page: number): Promise<Paginated<Game>> {
  const query = page > 1 ? `?page=${page}` : "";
  return request<Paginated<Game>>(`/api/games/${query}`);
}

export function getGame(slug: string): Promise<Game> {
  return request<Game>(`/api/games/${encodeURIComponent(slug)}/`);
}

/** Достаёт номер страницы из ссылок next/previous, которые отдаёт DRF. */
export function pageFromUrl(url: string | null): number | null {
  if (!url) {
    return null;
  }

  try {
    const value = new URL(url).searchParams.get("page");
    // DRF не добавляет ?page=1 в ссылку на первую страницу.
    if (!value) {
      return 1;
    }

    const page = Number.parseInt(value, 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  } catch {
    return null;
  }
}

/** Приводит searchParams.page к безопасному номеру страницы. */
export function parsePageParam(
  value: string | string[] | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Обложка может прийти абсолютным или относительным URL. */
export function resolveCoverUrl(cover: string | null): string | null {
  if (!cover) {
    return null;
  }

  if (/^https?:\/\//i.test(cover)) {
    return cover;
  }

  return new URL(cover, `${API_URL}/`).toString();
}
