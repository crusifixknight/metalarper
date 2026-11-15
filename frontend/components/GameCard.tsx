import Image from "next/image";
import Link from "next/link";

import { resolveCoverUrl, type Game } from "@/lib/api";

export default function GameCard({
  game,
  preload = false,
}: {
  game: Game;
  preload?: boolean;
}) {
  const cover = resolveCoverUrl(game.cover);

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Обложка */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-200 mb-2 rounded-sm">
        {cover ? (
          <Image
            src={cover}
            alt={`Обложка игры ${game.title}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover transition-opacity group-hover:opacity-80"
            preload={preload}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 p-2 text-center text-xs font-medium text-slate-500">
            {game.title}
          </div>
        )}
      </div>

      {/* Название */}
      <h3 className="font-semibold text-blue-600 group-hover:text-blue-800 line-clamp-1 mb-1 dark:text-blue-400 dark:group-hover:text-blue-300">
        {game.title}
      </h3>

      {/* Метаданные: жанры и год */}
      <div className="flex justify-between gap-2 text-gray-500 text-xs">
        <span className="line-clamp-1">
          {game.genres.length > 0
            ? game.genres.map((genre) => genre.name).join(", ")
            : "Без жанра"}
        </span>
        <span className="shrink-0">{game.release_year}</span>
      </div>

      {/* Студия */}
      <div className="mt-0.5 text-gray-400 text-xs line-clamp-1">
        {game.developer.name}
      </div>
    </Link>
  );
}
