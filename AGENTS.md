# AGENTS.md

Project context for AI agents and new developers. Read this file before changing
code so you don't waste time figuring out the structure.

## What this project is

**Metalarper** — a small video game catalog:

- `backend/` — Django + Django REST Framework, a public read-only catalog API;
  content is managed through the Django admin.
- `frontend/` — Next.js 16 (App Router, Server Components) + Tailwind CSS 4.
  Data is fetched from the backend **server-side only**.

UI text in Russian, code comments - English. Frontend docs — `frontend/README.md`.

## Mandatory agent workflow

These rules matter more than speed: agree first, then write code.

1. **Study the context.** Read this file and the relevant project files before
   changing anything. Do not guess how the code works from names alone.
2. **Ask about missing details.** If you do not have enough information to do
   the task precisely (unclear requirements, expected behavior, design, task
   boundaries, data format, affected screens/endpoints, how to verify the
   result, etc.), ask the developer **before** writing the plan or code.
   Do not silently pick one of several options and do not replace a requirement
   with a convenient assumption. One precise question is better than a wrong
   implementation.
3. **Write a plan.** Before changing any files, outline the plan: what you will
   change, in which files, what options/risks exist, how you will verify the
   result (test commands, lint, build, manual checks), and what is out of scope.
4. **Get approval.** Show the plan to the developer and explicitly ask whether
   it works for them. Start work **only after a positive answer**; agree on plan
   changes first instead of making them silently along the way.
5. **Work according to the agreed plan.** If it turns out the plan is unworkable
   or needs significant deviations, stop, explain why, and agree on a new plan.
6. **Report back.** When the whole task is done, list the changed files, what
   exactly was done, which checks were run and their results, plus any known
   limitations or remaining steps.
7. **Work in stages.** Do not try to complete a large task in one pass. Split it
   into small, self-contained stages with a clear outcome (e.g., backend
   endpoint → API client → UI → tests). Finish and verify one stage before
   starting the next, and keep the project working after every stage. If the
   task turns out to be bigger than expected, stop and propose a staged
   breakdown instead of silently expanding the scope.
8. **Propose a commit after each stage.** Once a stage is complete and its
   checks pass, report the result and propose a commit: list the changed files
   and show the suggested commit message in the project style (`Feat: ...`).
   Whether the agent creates the commit itself or leaves it to the developer is
   up to the developer — ask which they prefer. Never commit without explicit
   approval.

The only exception is an explicit developer instruction to proceed without a
plan (e.g., «сделай сразу, без вопросов»).

## Stack and versions

| Part | Technologies |
| --- | --- |
| Backend | Django 6.1.3, DRF 3.18.3, django-filter, SQLite (`backend/db.sqlite3`), Pillow, python-dotenv |
| Frontend | Next.js 16.4.6, React 19.3, TypeScript 5 (strict), Tailwind CSS 4.3, ESLint 9 |
| Python | the project uses `.venv/` at the repository root |

Important: **this is Next.js 16**, not "the Next.js you know". After
`npm install`, read the current guides in `frontend/node_modules/next/dist/docs/`
before writing code. `frontend/AGENTS.md` is generated automatically by
`next dev` — do not edit it by hand.

## Quick start

### Backend

```powershell
# from the repository root; .venv already exists
Copy-Item backend/.env.example backend/.env   # fill in a generated SECRET_KEY
.venv\Scripts\python.exe backend\manage.py migrate
.venv\Scripts\python.exe backend\manage.py createsuperuser
.venv\Scripts\python.exe backend\manage.py runserver
# optional: pre-warm/refresh the Steam cache (players, rating, news date)
.venv\Scripts\python.exe backend\manage.py refresh_steam
```

Without `backend/.env` containing `SECRET_KEY`, the app fails with
`ImproperlyConfigured`.
API: `http://127.0.0.1:8000/api/games/`, admin: `/admin/`,
covers: `http://127.0.0.1:8000/media/games/covers/...`.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local   # optional, the default matches
npm run dev
```

Catalog: `http://localhost:3000`, game page: `/games/<slug>`.

### Checks

```powershell
cd backend; ..\.venv\Scripts\python.exe manage.py check
cd backend; ..\.venv\Scripts\python.exe manage.py test api
cd frontend; npm run lint
cd frontend; npm run build
```

Automated tests exist only on the backend (`backend/api/tests.py`): the list is
public and paginated, detail by slug, unique slug generation, filters by
genre/developer/year range/search, the `/api/genres/`, `/api/developers/`
directories, `age_rating`, Steam snapshot caching / TTL / stale flag, star
calculation, the `refresh_steam` command, `related_games`, and genre-based
`recommended_games`. External HTTP is mocked in tests. There are no frontend
tests.

## Code map

### Backend

| File | Purpose |
| --- | --- |
| `backend/backend/settings.py` | settings: DRF, JWT, pagination, SQLite, MEDIA |
| `backend/backend/urls.py` | `/admin/`, `/api/`; media is served only when `DEBUG` |
| `backend/api/models.py` | `Developer`, `Genre`, `Game`, `SteamSnapshot` + `unique_slug()` |
| `backend/api/serializers.py` | nested `developer`/`genres`, flat `cover`, `steam`, `related_games`, `recommended_games`, `GameBriefSerializer` |
| `backend/api/filters.py` | `GameFilter`: `genres`, `developer`, `year_from`, `year_to`, `search` |
| `backend/api/views.py` | `GameViewSet` + `GenreViewSet` + `DeveloperViewSet`, `AllowAny`, `lookup_field = "slug"`; list/retrieve trigger background refresh and recommendations |
| `backend/api/steam.py` | public Steam fetchers (no API key): current players, review summary, last news date |
| `backend/api/services.py` | `SteamSnapshot` cache: TTL, stale-while-revalidate, background refresh, genre recommendations |
| `backend/api/management/commands/refresh_steam.py` | cron/pre-warm command for the Steam cache (`--force`) |
| `backend/api/urls.py` | DRF `DefaultRouter`: `games`, `genres`, `developers` |
| `backend/api/admin.py` | registers all four models; `SteamSnapshot` is read-only |

### Frontend

| File | Purpose |
| --- | --- |
| `frontend/lib/api.ts` | types, `ApiError`, `API_URL`, `getGames`, `getCatalogGames`, `getGame`, `getFacets`, filter parsing, sorting, pagination, `resolveCoverUrl` |
| `frontend/app/page.tsx` | static catalog shell: the «Каталог игр» heading + search box on the right; results, search, and sidebar stream inside separate `<Suspense>` boundaries |
| `frontend/components/CatalogFilters.tsx` | server-side filters: `searchParams` + genre/developer directories |
| `frontend/components/FilterSidebar.tsx` | GET filter form (`genres`, `year_from`/`year_to`, `developer`, `sort`), `FILTER_FORM_ID` for the search box, and a skeleton |
| `frontend/components/CatalogSearch.tsx` | search box in the header: input and magnifier button are bound to the filter form (`form={FILTER_FORM_ID}`), plus a skeleton |
| `frontend/components/CatalogResults.tsx` | filtered request, sorting, pagination, "empty" / "no such page" / "invalid filter" / "API unavailable" states |
| `frontend/components/GameCard.tsx` | game card (`next/image`, genres, year, developer) |
| `frontend/components/CatalogSkeleton.tsx` | catalog skeleton with `CATALOG_PAGE_SIZE` cards |
| `frontend/app/games/[slug]/page.tsx` | game detail page; `ApiError(404)` → `notFound()` |
| `frontend/app/error.tsx` | client error boundary |
| `frontend/app/not-found.tsx` | 404 page |
| `frontend/next.config.ts` | `cacheComponents`, `partialPrefetching`, `images.remotePatterns` derived from `API_URL` |

## API contract

```
GET /api/games/?page=N   -> { count, next, previous, results: [Game] }
GET /api/games/<slug>/   -> Game
GET /api/genres/         -> { count, next, previous, results: [Genre] }
GET /api/developers/     -> { count, next, previous, results: [Developer] }
```

Game list filters (`django-filter`, `backend/api/filters.py`):

```
GET /api/games/?genres=rpg&genres=action&developer=fromsoftware
                &year_from=2015&year_to=2020&search=witcher&page=1
```

`Game`: `id, title, slug, release_year, developer {id,name,slug},
genres [{id,name,slug}], description, age_rating, cover (absolute or relative
URL), steam, related_games, recommended_games`.
`Genre` and `Developer`: `id, name, slug`.
`GameBrief` (inside `related_games` / `recommended_games`):
`id, title, slug, release_year, cover`.

`steam` is `null` when `steam_appid` is not set; otherwise:

```
steam: {
  appid, store_url,            // https://store.steampowered.com/app/<appid>/
  current_players,             // Steam, current players right now
  rating_stars, rating_votes,  // review summary → 0–5 stars + review count
  last_updated,                // ISO-8601, date of the latest Steam news item
  is_stale                     // true while cached data is older than 15 min
}
```

- `related_games` — manual M2M ("same universe / story"), ordered by `title`.
- `recommended_games` — computed from shared genres: up to 4 games, more shared
  genres first, then by title; the game itself is excluded.
- Both are present in the list and in the detail response; the list computes
  them for the current page only.

- Pagination — DRF `PageNumberPagination`, `PAGE_SIZE = 12`; the first-page link
  does not contain `?page=1`.
- Filter logic: "AND" between groups, "OR" within `genres`/`developer`.
  An unknown slug or a non-numeric year → `400`.
- There is no `ordering` parameter: games are sorted by `title` by default.
  The frontend handles year sorting itself — it loads every page of the already
  filtered result (`getCatalogGames`) and slices it into pages of 12.
- Requests use `cache: "no-store"`, so the catalog always shows fresh data;
  completed responses are cached in process memory for 60 seconds.

## Steam data cache

External Steam data never blocks a catalog request (stale-while-revalidate):

- `SteamSnapshot` (OneToOne to `Game`) stores `current_players`,
  `rating_stars`, `rating_votes`, `last_updated`, `refreshed_at`.
- On list/retrieve, `services.ensure_snapshots_async()` checks
  `refreshed_at` against `STEAM_TTL` (15 min) and starts a daemon thread that
  refreshes stale snapshots through a `ThreadPoolExecutor`
  (`MAX_WORKERS = 6`, single-flight per appid).
- The response is built from the cache immediately: the first request after a
  cold start returns `null` fields with `is_stale: true`, and the data appears
  on the next request once the background refresh finishes.
- If all external calls fail, the snapshot is not overwritten: old values stay
  and `is_stale` remains `true` (the next request retries in the background).
- Sources (`backend/api/steam.py`, no API key, 5 s timeout):
  - players — `ISteamUserStats/GetNumberOfCurrentPlayers`;
  - rating — `IStoreBrowseService/GetItems` (`summary_filtered`:
    `percent_positive` → stars, `review_count` → votes), with the classic
    `store.steampowered.com/appreviews` endpoint as a fallback;
  - `last_updated` — `ISteamNews/GetNewsForApp/v2`, the latest news date (an
    approximation of the last patch, not a guaranteed patch date).
- `manage.py refresh_steam` updates stale snapshots synchronously (use
  `--force` to refresh everything); it is intended for cron/pre-warming in
  production.

## Data model and rules

- `Developer` and `Genre`: `name` (unique) + an auto-generated `slug`.
- `Game`: `title`, `slug`, `release_year` (≥ 1950, indexed), FK `developer`
  (`on_delete=PROTECT`, `related_name="games"`), M2M `genres` (`blank=True`),
  `description`, `age_rating` (free-form string, e.g. `18+`/`PEGI 16`),
  `cover` (`games/covers/`), `created_at`, `steam_appid` (unique, nullable),
  M2M `related_games` (self, non-symmetrical, `related_name="related_to"`).
- `SteamSnapshot`: OneToOne to `Game` (`related_name="steam_snapshot"`),
  `current_players`, `rating_stars` (Decimal, 0–5), `rating_votes`,
  `last_updated`, `refreshed_at` (`auto_now`). Filled only by the background
  refresh or the `refresh_steam` command; read-only in the admin.
- `age_rating` is maintained manually: Steam does not expose ESRB/PEGI in the
  used endpoints.
- Ordering: games by `title`, developers and genres by `name`.
- `unique_slug()` (in `models.py`) builds a slug from the name via
  `slugify(..., allow_unicode=True)` and appends `-2`, `-3` on collisions.
  The slug is only generated on first save: renaming does not change it, so game
  URLs stay stable.
- Migrations: `backend/api/migrations/` (0001 — games/developers, 0002 — genres,
  0003 — `age_rating`, `steam_appid`, `related_games`, `SteamSnapshot`).
  After changing models: `manage.py makemigrations api && manage.py migrate`.

## Conventions

- Server Components by default; there are no client components except
  `app/error.tsx` (it needs `"use client"` for `reset`).
- Fetch API data only through helpers from `lib/api.ts`. When changing
  serializers, update the types there too so the TS contract does not drift
  (the frontend does not consume the new card fields yet — see Pitfalls).
- External data goes through `backend/api/steam.py` (HTTP) and
  `backend/api/services.py` (caching/refresh). Do not call Steam from views or
  serializers: the API must stay fast and independent of the external service.
- `steam_appid`, `age_rating`, and `related_games` are edited in the Django
  admin; `SteamSnapshot` is filled automatically and is read-only there.
- In Next 16 `params` and `searchParams` are `Promise`s and must be awaited
  (see `CatalogResults`, `CatalogFilters`, and `GameDetails`).
- Catalog filters are a plain GET form; state lives in the URL:
  `genres` (multiple), `developer`, `year_from`, `year_to`, `search`, `sort`,
  `page`. The first five names match API parameters; `sort` is frontend-only.
- The search box lives outside the sidebar form and is bound to it via the
  `form={FILTER_FORM_ID}` attribute (the constant lives in `FilterSidebar.tsx`),
  so search is applied together with the filters. Uncontrolled inputs are reset
  via `key`; otherwise stale values remain after soft navigation (reset, "back").
- API errors: `ApiError` with `status` (0 — network unreachable, 404 — no such
  game/page).
- Styling — Tailwind utility classes directly in JSX; dark theme via
  `prefers-color-scheme` and `dark:` classes. Global tokens — `app/globals.css`.
- Covers: `resolveCoverUrl()` turns a relative path into an absolute one; the
  domain for `next/image` comes from `API_URL` in `next.config.ts`, so changing
  the backend domain only requires changing the environment variable.
- Frontend environment variable: `API_URL` (default
  `http://127.0.0.1:8000`). The `NEXT_PUBLIC_` prefix is not needed: requests are
  server-side, so no CORS is required on the backend.
- Commit style in history: a capitalized prefix (`Feat: ...`,
  `security: ...`).

## Pitfalls

- `DEBUG = True` and `ALLOWED_HOSTS = ["*"]` are hardcoded — this is dev
  configuration; production needs separate settings/env variables.
- SimpleJWT is wired into `DEFAULT_AUTHENTICATION_CLASSES`, and the default
  permissions are `IsAuthenticated`; `GameViewSet` explicitly sets `AllowAny`.
  Any new viewset without explicit `permission_classes` will be closed to
  anonymous users.
- JWT is installed, but there are no token endpoints in `urls.py`.
- `django-cors-headers` is in the dependencies and middleware, but
  `CORS_ALLOWED_ORIGINS` is not set — it will need configuring if API calls
  move to the client.
- `psycopg2-binary` is in `requirements.txt` even though SQLite is used.
  Python dependency versions are not pinned.
- `frontend/node_modules` is not in the repository: run `npm install` before
  working on the frontend, otherwise you get neither Next types nor docs.
- The current `db.sqlite3` is empty (0 games), and `backend/media/` does not
  exist yet — it will be created on the first cover upload. Use `/admin/` to
  populate data.
- Cover domains are restricted by `remotePatterns` (`/media/**`) and
  `dangerouslyAllowLocalIP` for local addresses: if covers start coming from
  another host/path, edit `next.config.ts`.
- `PAGE_SIZE` (12) in the DRF settings and `CATALOG_PAGE_SIZE` in
  `frontend/lib/api.ts` are linked manually: update both when changing the page
  size (the catalog skeleton takes the constant from `lib/api.ts`).
- The new card fields (`age_rating`, `steam`, `related_games`,
  `recommended_games`) are API-only for now: `GameCard`, the game page, and the
  types in `lib/api.ts` do not use them yet. Rendering them is a separate
  frontend task; until then, do not assume the UI shows Steam data.
- Steam refresh runs as a daemon thread inside the web process: best-effort and
  lost on restart. For production reliability use `manage.py refresh_steam` from
  cron (or a worker); multi-worker deployments share the DB cache, but the
  in-flight appid set is per process.
- Steam may throttle: the 15-minute TTL and single-flight per appid are the
  first line of defense. If throttling appears, raise `STEAM_TTL` or move the
  refresh to a worker/cron instead of increasing request-time calls.
- For a cold cache the first response returns `steam` fields as `null` with
  `is_stale: true`; the data appears on a subsequent request. This is expected,
  not a bug.
- The `store.steampowered.com/appreviews` fallback can redirect to the store
  home page in some networks (bot/geo protection). The primary rating source is
  `IStoreBrowseService/GetItems`; if Steam changes endpoints, fix only
  `backend/api/steam.py`.
- `last_updated` is the date of the latest Steam news item, not a guaranteed
  patch date, and may be `null` for games without news.
- Recommendations scan every game that shares at least one genre and intersect
  genres in Python: fine for a small catalog, but revisit (SQL limits, cache)
  if the catalog grows large.
- With SQLite, a background refresh write can rarely collide with a request
  ("database is locked"); writes are short, but a real deployment should use
  PostgreSQL or a separate refresh worker.
