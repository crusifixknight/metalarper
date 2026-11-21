const MAX_STARS = 5;

type StarRatingProps = {
  /** Rating from 0 to 5. */
  rating: number;
  /** Number of reviews, used in the accessible label. */
  votes?: number | null;
};

/** Five stars with a fractional fill, followed by the numeric rating. */
export default function StarRating({ rating, votes }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(MAX_STARS, rating));
  const filledPercent = (clamped / MAX_STARS) * 100;
  const votesLabel =
    typeof votes === "number"
      ? `, оценок: ${votes.toLocaleString("ru-RU")}`
      : "";
  const label = `Оценка ${clamped.toFixed(1)} из ${MAX_STARS}${votesLabel}`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5"
    >
      <span aria-hidden className="relative inline-block text-sm leading-none">
        <span className="text-gray-300 dark:text-gray-600">★★★★★</span>
        <span
          className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-400"
          style={{ width: `${filledPercent}%` }}
        >
          ★★★★★
        </span>
      </span>
      <span className="font-medium text-gray-700 dark:text-gray-200">
        {clamped.toFixed(1)}
      </span>
    </span>
  );
}
