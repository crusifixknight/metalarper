import Image from "next/image";
import Link from "next/link";

import { resolveCoverUrl, type GameBrief } from "@/lib/api";

/** Compact card used by the related and recommended game sections. */
export default function GameMiniCard({ game }: { game: GameBrief }) {
  const cover = resolveCoverUrl(game.cover);

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="relative mb-2 aspect-[2/3] w-full overflow-hidden rounded bg-gray-200">
        {cover ? (
          <Image
            src={cover}
            alt={`Обложка игры ${game.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-opacity group-hover:opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 p-2 text-center text-xs font-medium text-slate-500">
            {game.title}
          </div>
        )}
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300">
        {game.title}
      </h3>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {game.release_year}
      </p>
    </Link>
  );
}
