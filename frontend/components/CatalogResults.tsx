import Link from "next/link";

import GameCard from "@/components/GameCard";
import {
  ApiError,
  getGames,
  pageFromUrl,
  parsePageParam,
} from "@/lib/api";

function catalogHref(page: number) {
  return page > 1 ? `/?page=${page}` : "/";
}

type CatalogResultsProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function CatalogResults({
  searchParams,
}: CatalogResultsProps) {
  const page = parsePageParam((await searchParams).page);

  let data;

  try {
    data = await getGames(page);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="rounded-md border border-gray-200 p-6 text-sm dark:border-gray-700">
          <p className="mb-2 font-semibold">Страницы {page} нет в каталоге.</p>
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            Перейти к первой странице
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="mb-1 font-semibold">Не удалось загрузить каталог.</p>
        <p>
          {error instanceof Error
            ? error.message
            : "Неизвестная ошибка при запросе к API."}
        </p>
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

  const nextPage = pageFromUrl(data.next);
  const previousPage = pageFromUrl(data.previous);

  // На неполной странице нельзя вычислить размер страницы по results,
  // но отсутствие next означает, что текущая страница — последняя.
  const totalPages = nextPage
    ? Math.max(Math.ceil(data.count / Math.max(data.results.length, 1)), page)
    : Math.max(page, 1);

  if (data.count === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        В каталоге пока нет ни одной игры. Добавьте их через Django-админку.
      </div>
    );
  }

  return (
    <>
      {/* Верхняя панель с информацией и пагинацией */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span>Найдено {data.count.toLocaleString("ru-RU")} игр.</span>
        <span className="mx-2">|</span>

        {previousPage ? (
          <Link href={catalogHref(previousPage)} className="hover:underline">
            ← назад
          </Link>
        ) : (
          <span className="text-gray-300">← назад</span>
        )}

        <span>
          Страница{" "}
          <span className="font-semibold text-foreground">{page}</span> из{" "}
          {totalPages}
        </span>

        {nextPage ? (
          <Link href={catalogHref(nextPage)} className="hover:underline">
            вперёд →
          </Link>
        ) : (
          <span className="text-gray-300">вперёд →</span>
        )}
      </div>

      {/* Сетка игр */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {data.results.map((game, index) => (
          <GameCard key={game.id} game={game} preload={index === 0} />
        ))}
      </div>
    </>
  );
}
