import { logoutAction } from "@/app/actions/auth";
import AuthMenu from "@/components/auth/AuthMenu";
import { getCurrentUser } from "@/lib/session";

/**
 * Server part of the header auth block.
 *
 * Reads the session cookie, so it must stay inside a `<Suspense>` boundary:
 * the rest of the layout can then prerender into the static shell.
 */
export default async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthMenu />;
  }

  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span
        className="max-w-[12rem] truncate font-medium text-gray-700 dark:text-gray-200"
        title={user.username}
      >
        {user.username}
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}

/** Placeholder shown while the session cookie is being read. */
export function AuthStatusSkeleton() {
  return (
    <div
      aria-hidden
      className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
    />
  );
}
