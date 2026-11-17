import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center justify-center p-10 text-center font-sans text-sm">
      <p className="mb-2 text-5xl font-bold text-gray-300">404</p>
      <h1 className="mb-2 text-xl font-bold">Игра не найдена</h1>
      <p className="mb-6 text-gray-500">
        Возможно, игра была удалена или ссылка содержит опечатку.
      </p>
      <Link
        href="/"
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Вернуться в каталог
      </Link>
    </main>
  );
}
