import Link from "next/link";

import GameCard from "@/components/GameCard";
import {
  ApiError,
  buildCatalogHref,
  getCatalogGames,
  hasActiveFilters,
  hasCustomSort,
  paginateGames,
  parseCatalogFilters,
  parsePageParam,
  sortGames,
  type CatalogSearchParams,
  type Game,
} from "@/lib/api";

type CatalogResultsProps = {
  searchParams: Promise<CatalogSearchParams>;
};

export default async function CatalogResults({
  searchParams,
}: CatalogResultsProps) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const page = parsePageParam(params.page);
  const filtersActive = hasActiveFilters(filters);
  const canReset = filtersActive || hasCustomSort(filters);

  let games: Game[];

  try {
    // Фильтры (жанры, студия, диапазон лет) применяет бэкенд.
    games = await getCatalogGames(filters);
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="mb-1 font-semibold">Не удалось загрузить каталог.</p>
          <p>{error.message}</p>
          <p className="mt-2 text-red-700">
            Проверьте, что бэкенд запущен командой{" "}
            <code className="rounded bg-red-100 px-1">
              python manage.py runserver
            </code>
            , и повторите попытку.
          </p>
        </div>
      );
    }

    if (error instanceof ApiError && error.status === 400) {
      return (
        <div className="rounded-md border border-gray-200 p-6 text-sm dark:border-gray-700">
          <p className="mb-2 font-semibold">
            Фильтр содержит неизвестное значение.
          </p>
          <p className="mb-3 text-gray-500">
            Возможно, жанр или студия были удалены. Сбросьте фильтры и выберите
            значения заново.
          </p>
          <Link
            href="/"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Сбросить фильтры
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-gray-200 p-6 text-sm dark:border-gray-700">
        <p className="mb-2 font-semibold">
          Не удалось прочитать каталог из API.
        </p>
        <p className="mb-2">
          {error instanceof Error
            ? error.message
            : "Неизвестная ошибка при запросе к API."}
        </p>
        <Link
          href="/"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Попробовать снова
        </Link>
      </div>
    );
  }

  if (games.length === 0) {
    return filtersActive ? (
      <div className="rounded-md border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">
        <p className="mb-3">По выбранным фильтрам ничего не найдено.</p>
        <Link
          href="/"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Сбросить фильтры
        </Link>
      </div>
    ) : (
      <div className="rounded-md border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        В каталоге пока нет ни одной игры. Добавьте их через Django-админку.
      </div>
    );
  }

  // В API нет параметра ordering, поэтому сортируем сами.
  const sorted = sortGames(games, filters.sort);
  const { items, total, totalPages } = paginateGames(sorted, page);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 p-6 text-sm dark:border-gray-700">
        <p className="mb-2 font-semibold">
          Страницы {page} нет: всего {totalPages} стр.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href={buildCatalogHref(filters)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            К первой странице
          </Link>
          <Link
            href={buildCatalogHref(filters, totalPages)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            К последней странице
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Верхняя панель с информацией и пагинацией */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>
          {filtersActive
            ? `Найдено ${total.toLocaleString("ru-RU")} игр по выбранным фильтрам.`
            : `Найдено ${total.toLocaleString("ru-RU")} игр.`}
        </span>
        <span className="mx-2">|</span>

        {page > 1 ? (
          <Link
            href={buildCatalogHref(filters, page - 1)}
            className="hover:underline"
          >
            ← назад
          </Link>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">← назад</span>
        )}

        <span>
          Страница <span className="font-semibold text-foreground">{page}</span>{" "}
          из {totalPages}
        </span>

        {page < totalPages ? (
          <Link
            href={buildCatalogHref(filters, page + 1)}
            className="hover:underline"
          >
            вперёд →
          </Link>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">вперёд →</span>
        )}

        {canReset && (
          <Link
            href="/"
            className="ml-auto text-blue-600 hover:underline dark:text-blue-400"
          >
            Сбросить фильтры
          </Link>
        )}
      </div>

      {/* Сетка игр */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((game, index) => (
          <GameCard key={game.id} game={game} preload={index === 0} />
        ))}
      </div>
    </>
  );
}
