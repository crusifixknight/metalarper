import Link from "next/link";

import type { CatalogFacets, CatalogFilters } from "@/lib/api";

const controlClassName =
  "w-full rounded border border-gray-300 bg-white p-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900";

const labelClassName =
  "mb-1 block font-medium text-gray-700 dark:text-gray-200";

/** id формы сайдбара: на него ссылается строка поиска в шапке. */
export const FILTER_FORM_ID = "catalog-filters";

export type FilterSidebarProps = {
  filters: CatalogFilters;
  facets: CatalogFacets | null;
};

/**
 * Сайдбар фильтров каталога.
 *
 * Это обычная GET-форма: состояние живёт в query-параметрах URL, поэтому
 * фильтры работают без клиентского JavaScript. Параметры (`genres`,
 * `developer`, `year_from`, `year_to`) совпадают с контрактом Django API.
 */
export default function FilterSidebar({ filters, facets }: FilterSidebarProps) {
  // При мягкой навигации (сброс фильтров, кнопка «назад») React переиспользует
  // неконтролируемые поля и оставляет в них старые значения. key заставляет
  // форму перемонтироваться, когда фильтры в URL меняются.
  const formKey = JSON.stringify([
    filters.genres,
    filters.developer,
    filters.yearFrom,
    filters.yearTo,
    filters.sort,
  ]);

  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="mb-4 text-lg font-bold">ФИЛЬТРЫ</h3>

      {!facets ? (
        <p className="rounded bg-gray-50 p-2 text-xs leading-relaxed text-gray-500 dark:bg-gray-900">
          Не удалось загрузить варианты фильтров: API недоступен. Проверьте,
          что бэкенд запущен, и обновите страницу.
        </p>
      ) : (
        <form method="get" action="/" id={FILTER_FORM_ID} key={formKey}>
          {/* Сортировка */}
          <div className="mb-3">
            <label htmlFor="filter-sort" className={labelClassName}>
              Сортировка
            </label>
            <select
              id="filter-sort"
              name="sort"
              defaultValue={filters.sort}
              className={controlClassName}
            >
              <option value="title">по алфавиту</option>
              <option value="year-desc">сначала новые</option>
              <option value="year-asc">сначала старые</option>
            </select>
          </div>

          {/* Жанры: мультивыбор, совпадение хотя бы по одному */}
          <fieldset className="mb-3">
            <legend className={labelClassName}>Жанры</legend>
            {facets.genres.length === 0 ? (
              <p className="text-xs text-gray-400">Жанры не заданы.</p>
            ) : (
              <div className="space-y-1">
                {facets.genres.map((genre) => (
                  <label
                    key={genre.slug}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      name="genres"
                      value={genre.slug}
                      defaultChecked={filters.genres.includes(genre.slug)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="flex-1">{genre.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Год выхода: бэкенд принимает диапазон */}
          <fieldset className="mb-3">
            <legend className={labelClassName}>Год выхода</legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="year_from"
                min={1950}
                max={2100}
                inputMode="numeric"
                placeholder="от"
                aria-label="Год от"
                defaultValue={filters.yearFrom ?? ""}
                className={controlClassName}
              />
              <span className="text-gray-400">—</span>
              <input
                type="number"
                name="year_to"
                min={1950}
                max={2100}
                inputMode="numeric"
                placeholder="до"
                aria-label="Год до"
                defaultValue={filters.yearTo ?? ""}
                className={controlClassName}
              />
            </div>
          </fieldset>

          {/* Студия */}
          <div className="mb-3">
            <label htmlFor="filter-developer" className={labelClassName}>
              Студия
            </label>
            <select
              id="filter-developer"
              name="developer"
              defaultValue={filters.developer ?? ""}
              className={controlClassName}
            >
              <option value="">любая</option>
              {facets.developers.map((developer) => (
                <option key={developer.slug} value={developer.slug}>
                  {developer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
            >
              Применить
            </button>
            <Link
              href="/"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Сбросить
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

/** Заглушка сайдбара на время загрузки справочников. */
export function FilterSidebarSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-pulse rounded-md border border-gray-200 p-4 dark:border-gray-700"
    >
      <div className="mb-4 h-5 w-24 rounded bg-gray-200" />
      <div className="mb-2 h-3.5 w-20 rounded bg-gray-200" />
      <div className="mb-4 h-8 w-full rounded bg-gray-200" />
      <div className="mb-2 h-3.5 w-16 rounded bg-gray-200" />
      <div className="mb-1 h-3.5 w-full rounded bg-gray-200" />
      <div className="mb-1 h-3.5 w-full rounded bg-gray-200" />
      <div className="mb-4 h-3.5 w-4/5 rounded bg-gray-200" />
      <div className="mb-2 h-3.5 w-24 rounded bg-gray-200" />
      <div className="h-8 w-full rounded bg-gray-200" />
    </div>
  );
}
