import StarRating from "@/components/StarRating";
import type { Game } from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Compact metadata shown to the right of the game title.
 *
 * Items are added as data becomes available; games without Steam data simply
 * show fewer items instead of empty placeholders.
 */
export default function GameMeta({ game }: { game: Game }) {
  const rating = game.steam?.rating_stars;
  const lastUpdated = game.steam?.last_updated;
  const players = game.steam?.current_players;
  const storeUrl = game.steam?.store_url;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400">
      {typeof rating === "number" && (
        <StarRating rating={rating} votes={game.steam?.rating_votes} />
      )}

      {game.age_rating && (
        <span
          className="rounded border border-gray-300 px-1.5 py-0.5 font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200"
          title="Возрастной рейтинг"
        >
          {game.age_rating}
        </span>
      )}

      {lastUpdated && (
        <span title="Последнее обновление игры">
          Обновлено {formatDate(lastUpdated)}
        </span>
      )}

      {typeof players === "number" && (
        <span title="Игроков сейчас в Steam">
          Игроков: {formatNumber(players)}
        </span>
      )}

      {storeUrl && (
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть игру в Steam"
          title="Открыть игру в Steam"
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Steam ↗
        </a>
      )}
    </div>
  );
}
