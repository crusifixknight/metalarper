import { FILTER_FORM_ID } from "@/components/FilterSidebar";
import { parseCatalogFilters, type CatalogSearchParams } from "@/lib/api";

type CatalogSearchProps = {
  searchParams: Promise<CatalogSearchParams>;
};

/**
 * Строка поиска в шапке каталога.
 *
 * Поле и кнопка привязаны к форме сайдбара через HTML-атрибут `form`,
 * поэтому поиск применяется вместе с выбранными жанрами, годом и студией.
 * Клиентский JavaScript не нужен.
 */
export default async function CatalogSearch({
  searchParams,
}: CatalogSearchProps) {
  const filters = parseCatalogFilters(await searchParams);

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <input
        key={filters.search}
        type="search"
        name="search"
        form={FILTER_FORM_ID}
        defaultValue={filters.search}
        placeholder="Поиск по названию"
        aria-label="Поиск по названию"
        className="w-full min-w-0 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none sm:w-64 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        form={FILTER_FORM_ID}
        aria-label="Найти"
        title="Найти"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/** Заглушка строки поиска на время стриминга. */
export function CatalogSearchSkeleton() {
  return (
    <div
      aria-hidden
      className="flex w-full animate-pulse items-center gap-2 sm:w-auto"
    >
      <div className="h-[34px] w-full rounded bg-gray-200 sm:w-64" />
      <div className="h-[34px] w-[34px] shrink-0 rounded bg-gray-200" />
    </div>
  );
}
