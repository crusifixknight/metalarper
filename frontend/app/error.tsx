"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center justify-center p-10 text-center font-sans text-sm">
      <h1 className="mb-2 text-xl font-bold">Не удалось загрузить данные</h1>
      <p className="mb-6 text-gray-500">
        {error.message || "Произошла неизвестная ошибка."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Попробовать снова
      </button>
    </main>
  );
}
