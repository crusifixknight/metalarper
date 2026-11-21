import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import GameMeta from "@/components/GameMeta";
import { ApiError, getGame, resolveCoverUrl } from "@/lib/api";

type GamePageProps = {
  params: Promise<{ slug: string }>;
};

export default function GamePage({ params }: GamePageProps) {
  return (
    <main className="mx-auto max-w-5xl p-4 font-sans text-sm">
      <Link
        href="/"
        className="mb-4 inline-block text-blue-600 hover:underline dark:text-blue-400"
      >
        ← В каталог
      </Link>

      <Suspense fallback={<GameDetailsSkeleton />}>
        <GameDetails params={params} />
      </Suspense>
    </main>
  );
}

async function GameDetails({ params }: GamePageProps) {
  const { slug } = await params;

  let game;

  try {
    game = await getGame(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const cover = resolveCoverUrl(game.cover);

  return (
    <article className="grid gap-6 md:grid-cols-[260px_1fr]">
      {/* Обложка */}
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[260px] overflow-hidden rounded bg-gray-200">
        {cover ? (
          <Image
            src={cover}
            alt={`Обложка игры ${game.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 260px"
            className="object-cover"
            preload
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 p-4 text-center text-sm font-medium text-slate-500">
            {game.title}
          </div>
        )}
      </div>

      {/* Информация */}
      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{game.title}</h1>
          <GameMeta game={game} />
        </div>

        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-gray-600 dark:text-gray-400">
          <dt>Год выхода</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {game.release_year}
          </dd>

          <dt>Студия</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {game.developer.name}
          </dd>

          <dt>Жанры</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {game.genres.length > 0
              ? game.genres.map((genre) => genre.name).join(", ")
              : "—"}
          </dd>
        </dl>

        <p className="whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-300">
          {game.description || "Описание пока не добавлено."}
        </p>
      </div>
    </article>
  );
}

function GameDetailsSkeleton() {
  return (
    <div aria-hidden className="grid animate-pulse gap-6 md:grid-cols-[260px_1fr]">
      <div className="mx-auto aspect-[2/3] w-full max-w-[260px] rounded bg-gray-200" />
      <div>
        <div className="mb-3 h-7 w-2/3 rounded bg-gray-200" />
        <div className="mb-2 h-3.5 w-1/3 rounded bg-gray-200" />
        <div className="mb-2 h-3.5 w-1/2 rounded bg-gray-200" />
        <div className="mb-6 h-3.5 w-2/5 rounded bg-gray-200" />
        <div className="mb-2 h-3 w-full rounded bg-gray-200" />
        <div className="mb-2 h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}
