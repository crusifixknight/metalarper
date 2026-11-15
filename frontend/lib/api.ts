/**
 * Тонкий клиент к Django REST API.
 *
 * Запросы выполняются только на сервере (Server Components), поэтому
 * переменная API_URL не нуждается в префиксе NEXT_PUBLIC_ и не попадает
 * в браузерный бандл. Это же избавляет от необходимости настраивать CORS
 * на бэкенде.
 *
 * Фильтрацию выполняет бэкенд (`GameFilter`): genres, developer,
 * year_from, year_to. Сортировки по году в API нет, поэтому фронтенд
 * догружает все страницы уже отфильтрованного результата и сортирует их
 * самостоятельно.
 */

import { io } from "next/cache";

export const API_URL = (
  process.env.API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/** Размер страницы, который задаёт DRF (PAGE_SIZE = 12). */
export const CATALOG_PAGE_SIZE = 12;

/** Сколько живёт выгруженный ответ в памяти сервера. */
const CACHE_TTL_MS = 60_000;

/** Предохранитель от бесконечной выгрузки, если каталог сильно вырастет. */
const MAX_PAGES = 500;

/** Сколько разных наборов фильтров держим в кэше. */
const MAX_CACHED_QUERIES = 30;

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

export type CatalogSort = "title" | "year-desc" | "year-asc";

export type CatalogFilters = {
  /** Slug'и жанров; внутри группы действует «ИЛИ». */
  genres: string[];
  /** Slug студии. */
  developer: string | null;
  /** Нижняя граница года выпуска. */
  yearFrom: number | null;
  /** Верхняя граница года выпуска. */
  yearTo: number | null;
  /** Поиск по названию; пустая строка — без поиска. */
  search: string;
  sort: CatalogSort;
};

export type CatalogFacets = {
  genres: Genre[];
  developers: Developer[];
};

export type CatalogSearchParams = {
  page?: string | string[];
  genres?: string | string[];
  developer?: string | string[];
  year_from?: string | string[];
  year_to?: string | string[];
  search?: string | string[];
  sort?: string | string[];
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

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      // Данные должны быть свежими при каждом обращении к API.
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
      `API вернул ошибку ${response.status} для ${new URL(url).pathname}`,
    );
  }

  return (await response.json()) as T;
}

function request<T>(path: string): Promise<T> {
  return fetchJson<T>(`${API_URL}${path}`);
}

/** Защита от подмены ссылки пагинации на чужой хост. */
function sameOriginUrl(url: string): string {
  const target = new URL(url);
  const api = new URL(API_URL);

  if (target.origin !== api.origin) {
    throw new ApiError(0, "API вернул ссылку пагинации на чужой домен.");
  }

  return target.toString();
}

/**
 * Собирает все страницы списка, переходя по ссылкам next от DRF.
 * Предохранитель MAX_PAGES не даёт выгрузке стать бесконечной.
 */
async function collectPages<T>(
  firstPage: Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await firstPage;
  const items = [...first.results];

  let next = first.next;
  let pages = 1;

  while (next) {
    pages += 1;

    if (pages > MAX_PAGES) {
      throw new ApiError(
        0,
        `Слишком много страниц (больше ${MAX_PAGES}): ` +
          "полная выгрузка для фильтров стала слишком дорогой.",
      );
    }

    const page = await fetchJson<Paginated<T>>(sameOriginUrl(next));
    items.push(...page.results);
    next = page.next;
  }

  return items;
}

/** Параметры фильтрации в том виде, который понимает бэкенд. */
function filterParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();

  for (const genre of filters.genres) {
    params.append("genres", genre);
  }

  if (filters.developer) {
    params.set("developer", filters.developer);
  }

  if (filters.yearFrom !== null) {
    params.set("year_from", String(filters.yearFrom));
  }

  if (filters.yearTo !== null) {
    params.set("year_to", String(filters.yearTo));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  return params;
}

/** Путь к списку игр с фильтрами и, при необходимости, страницей. */
function gamesPath(filters: CatalogFilters, page = 1): string {
  const params = filterParams(filters);

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return `/api/games/${query ? `?${query}` : ""}`;
}

/** Одна страница каталога, отфильтрованная бэкендом. */
export function getGames(
  filters: CatalogFilters,
  page = 1,
): Promise<Paginated<Game>> {
  return request<Paginated<Game>>(gamesPath(filters, page));
}

export function getGame(slug: string): Promise<Game> {
  return request<Game>(`/api/games/${encodeURIComponent(slug)}/`);
}

type GamesCacheEntry = { games: Game[]; expiresAt: number };

const gamesCache = new Map<string, GamesCacheEntry>();
const gamesInFlight = new Map<string, Promise<Game[]>>();

function rememberGames(key: string, games: Game[]) {
  if (gamesCache.size >= MAX_CACHED_QUERIES) {
    const oldest = gamesCache.keys().next();
    if (!oldest.done) {
      gamesCache.delete(oldest.value);
    }
  }

  gamesCache.set(key, { games, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Возвращает весь отфильтрованный каталог.
 *
 * Бэкенд умеет фильтровать, но не умеет сортировать по году, поэтому для
 * сортировки нужны все совпадения. Результат кэшируется в памяти процесса
 * на минуту; одновременные запросы делят одно и то же обещание.
 */
export async function getCatalogGames(filters: CatalogFilters): Promise<Game[]> {
  // Читаем Date.now() для кэша: без io() это значение попало бы в пререндер
  // и Next.js сообщил бы об «unstable value».
  await io();

  const key = gamesPath(filters);
  const cached = gamesCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.games);
  }

  let inFlight = gamesInFlight.get(key);

  if (!inFlight) {
    inFlight = collectPages(getGames(filters))
      .then((games) => {
        rememberGames(key, games);
        return games;
      })
      .finally(() => {
        gamesInFlight.delete(key);
      });

    gamesInFlight.set(key, inFlight);
  }

  return inFlight;
}

let facetsCache: { facets: CatalogFacets; expiresAt: number } | null = null;
let facetsInFlight: Promise<CatalogFacets> | null = null;

/**
 * Справочники для сайдбара: жанры и студии.
 *
 * Оба списка пагинированы DRF, поэтому вычитываются полностью и кэшируются
 * вместе: они меняются редко и небольшие по размеру.
 */
export async function getFacets(): Promise<CatalogFacets> {
  await io();

  if (facetsCache && facetsCache.expiresAt > Date.now()) {
    return Promise.resolve(facetsCache.facets);
  }

  if (!facetsInFlight) {
    facetsInFlight = Promise.all([
      collectPages(request<Paginated<Genre>>("/api/genres/")),
      collectPages(request<Paginated<Developer>>("/api/developers/")),
    ])
      .then(([genres, developers]) => {
        const facets = { genres, developers };
        facetsCache = { facets, expiresAt: Date.now() + CACHE_TTL_MS };
        return facets;
      })
      .finally(() => {
        facetsInFlight = null;
      });
  }

  return facetsInFlight;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseYear(value: string | undefined): number | null {
  const year = Number.parseInt(value ?? "", 10);
  return Number.isFinite(year) && year >= 1950 ? year : null;
}

const SORT_VALUES: CatalogSort[] = ["title", "year-desc", "year-asc"];

/** Разбирает searchParams в нормализованный набор фильтров. */
export function parseCatalogFilters(
  params: CatalogSearchParams,
): CatalogFilters {
  const genresRaw = params.genres;
  const genres = (
    Array.isArray(genresRaw) ? genresRaw : genresRaw ? [genresRaw] : []
  ).filter(Boolean);

  let yearFrom = parseYear(firstValue(params.year_from));
  let yearTo = parseYear(firstValue(params.year_to));

  // Если границы перепутаны, меняем их местами, а не отдаём пустой каталог.
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  const sortRaw = firstValue(params.sort) as CatalogSort | undefined;

  return {
    genres: [...new Set(genres)],
    developer: firstValue(params.developer) || null,
    yearFrom,
    yearTo,
    search: (firstValue(params.search) ?? "").trim(),
    sort:
      sortRaw && SORT_VALUES.includes(sortRaw) ? sortRaw : "title",
  };
}

/** Сортирует игры на фронтенде: в API нет параметра ordering. */
export function sortGames(games: Game[], sort: CatalogSort): Game[] {
  const sorted = [...games];

  sorted.sort((a, b) => {
    switch (sort) {
      case "year-desc":
        return (
          b.release_year - a.release_year ||
          a.title.localeCompare(b.title, "ru")
        );
      case "year-asc":
        return (
          a.release_year - b.release_year ||
          a.title.localeCompare(b.title, "ru")
        );
      default:
        return a.title.localeCompare(b.title, "ru");
    }
  });

  return sorted;
}

/** Нарезает отфильтрованный каталог на страницы. */
export function paginateGames(games: Game[], page: number) {
  const totalPages = Math.max(1, Math.ceil(games.length / CATALOG_PAGE_SIZE));
  const start = (page - 1) * CATALOG_PAGE_SIZE;

  return {
    items: games.slice(start, start + CATALOG_PAGE_SIZE),
    total: games.length,
    totalPages,
    page,
  };
}

/** Ссылка на каталог с сохранением фильтров и номера страницы. */
export function buildCatalogHref(
  filters: CatalogFilters,
  page = 1,
): string {
  const params = filterParams(filters);

  if (filters.sort !== "title") {
    params.set("sort", filters.sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.genres.length > 0 ||
    filters.developer !== null ||
    filters.yearFrom !== null ||
    filters.yearTo !== null ||
    filters.search !== ""
  );
}

export function hasCustomSort(filters: CatalogFilters): boolean {
  return filters.sort !== "title";
}

/** Приводит searchParams.page к безопасному номеру страницы. */
export function parsePageParam(
  value: string | string[] | undefined,
): number {
  const page = Number.parseInt(firstValue(value) ?? "", 10);
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
