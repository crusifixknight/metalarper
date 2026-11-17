# AGENTS.md

Контекст проекта для AI-агентов и новых разработчиков. Прочитайте этот файл
перед изменением кода, чтобы не тратить время на разбор структуры.

## Что это за проект

**Metalarper** — небольшой каталог видеоигр:

- `backend/` — Django + Django REST Framework, публичное read-only API каталога,
  контент заводится через Django-админку.
- `frontend/` — Next.js 16 (App Router, Server Components) + Tailwind CSS 4.
  Данные запрашиваются с бэкенда **только на сервере**.

Интерфейс и комментарии в коде — на русском. Документация фронтенда —
`frontend/README.md`.

## Обязательный порядок работы агента

Эти правила важнее скорости: сначала согласование, потом код.

1. **Изучите контекст.** Прочитайте этот файл и релевантные файлы проекта,
   прежде чем что-то менять. Не додумывайте устройство кода по названиям.
2. **Уточняйте недостающее.** Если для точного выполнения задачи не хватает
   данных (неясны требования, ожидаемое поведение, дизайн, границы задачи,
   формат данных, затрагиваемые экраны/эндпоинты, способ проверки результата и
   т. п.) — задайте вопросы разработчику **до** написания плана и кода.
   Не выбирайте молча один из нескольких вариантов и не подменяйте требование
   удобным допущением. Один точный вопрос лучше неверной реализации.
3. **Составьте план.** Перед любым изменением файлов распишите план действий:
   что будете менять, в каких файлах, какие есть варианты/риски, как проверите
   результат (команды тестов, lint, build, ручная проверка) и что останется
   за рамками задачи.
4. **Получите подтверждение.** Покажите план разработчику и явно спросите,
   всё ли его устраивает. Приступайте к работе **только после положительного
   ответа**; правки в плане сначала согласуйте, а не вносите по ходу молча.
5. **Работайте по согласованному плану.** Если в процессе выяснилось, что план
   невыполним или требует существенных отклонений — остановитесь, объясните
   причину и согласуйте новый план.
6. **Отчитывайтесь.** По завершении перечислите изменённые файлы, что именно
   сделано, какие проверки запускались и их результат, а также известные
   ограничения или оставшиеся шаги.

Исключение — только явное указание разработчика действовать без плана
(например, «сделай сразу, без вопросов»).

## Стек и версии

| Часть | Технологии |
| --- | --- |
| Backend | Django 6.1.3, DRF 3.18.3, django-filter, SQLite (`backend/db.sqlite3`), Pillow, python-dotenv |
| Frontend | Next.js 16.4.6, React 19.3, TypeScript 5 (strict), Tailwind CSS 4.3, ESLint 9 |
| Python | проект использует `.venv/` в корне репозитория |

Важно: **это Next.js 16**, а не «тот Next.js, который вы знаете». После
`npm install` читайте актуальные гайды в `frontend/node_modules/next/dist/docs/`
перед написанием кода. `frontend/AGENTS.md` генерируется автоматически
командой `next dev` — не редактируйте его вручную.

## Быстрый старт

### Backend

```powershell
# из корня репозитория; .venv уже создан
Copy-Item backend/.env.example backend/.env   # вписать сгенерированный SECRET_KEY
.venv\Scripts\python.exe backend\manage.py migrate
.venv\Scripts\python.exe backend\manage.py createsuperuser
.venv\Scripts\python.exe backend\manage.py runserver
```

Без `backend/.env` с `SECRET_KEY` приложение падает с `ImproperlyConfigured`.
API: `http://127.0.0.1:8000/api/games/`, админка: `/admin/`,
обложки: `http://127.0.0.1:8000/media/games/covers/...`.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local   # опционально, дефолт совпадает
npm run dev
```

Каталог: `http://localhost:3000`, карточка: `/games/<slug>`.

### Проверки

```powershell
cd backend; ..\.venv\Scripts\python.exe manage.py check
cd backend; ..\.venv\Scripts\python.exe manage.py test api
cd frontend; npm run lint
cd frontend; npm run build
```

Автотесты есть только на бэкенде (`backend/api/tests.py`): публичность и
пагинация списка, деталь по slug, генерация уникальных slug, фильтры по
жанрам/студии/диапазону лет/поиску и справочники `/api/genres/`,
`/api/developers/`. Тестов фронтенда нет.

## Карта кода

### Backend

| Файл | Назначение |
| --- | --- |
| `backend/backend/settings.py` | настройки: DRF, JWT, пагинация, SQLite, MEDIA |
| `backend/backend/urls.py` | `/admin/`, `/api/`; медиа раздаётся только при `DEBUG` |
| `backend/api/models.py` | `Developer`, `Genre`, `Game` + `unique_slug()` |
| `backend/api/serializers.py` | вложенные `developer` и `genres`, плоский `cover` |
| `backend/api/filters.py` | `GameFilter`: `genres`, `developer`, `year_from`, `year_to`, `search` |
| `backend/api/views.py` | `GameViewSet` + `GenreViewSet` + `DeveloperViewSet`, `AllowAny`, `lookup_field = "slug"` |
| `backend/api/urls.py` | DRF `DefaultRouter`: `games`, `genres`, `developers` |
| `backend/api/admin.py` | регистрация всех трёх моделей |

### Frontend

| Файл | Назначение |
| --- | --- |
| `frontend/lib/api.ts` | типы, `ApiError`, `API_URL`, `getGames`, `getCatalogGames`, `getGame`, `getFacets`, разбор фильтров, сортировка, пагинация, `resolveCoverUrl` |
| `frontend/app/page.tsx` | статический каркас каталога: заголовок «Каталог игр» + строка поиска справа; результаты, поиск и сайдбар стримятся в отдельных `<Suspense>` |
| `frontend/components/CatalogFilters.tsx` | серверная часть фильтров: `searchParams` + справочники жанров/студий |
| `frontend/components/FilterSidebar.tsx` | GET-форма фильтров (`genres`, `year_from`/`year_to`, `developer`, `sort`), `FILTER_FORM_ID` для строки поиска и скелетон |
| `frontend/components/CatalogSearch.tsx` | строка поиска в шапке: поле и кнопка-лупа привязаны к форме фильтров (`form={FILTER_FORM_ID}`), плюс скелетон |
| `frontend/components/CatalogResults.tsx` | запрос с фильтрами, сортировка, пагинация, состояния «пусто» / «нет страницы» / «некорректный фильтр» / «API недоступен» |
| `frontend/components/GameCard.tsx` | карточка игры (`next/image`, жанры, год, студия) |
| `frontend/components/CatalogSkeleton.tsx` | скелетон каталога на `CATALOG_PAGE_SIZE` карточек |
| `frontend/app/games/[slug]/page.tsx` | детальная страница, `ApiError(404)` → `notFound()` |
| `frontend/app/error.tsx` | клиентский error boundary |
| `frontend/app/not-found.tsx` | страница 404 |
| `frontend/next.config.ts` | `cacheComponents`, `partialPrefetching`, `images.remotePatterns` из `API_URL` |

## Контракт API

```
GET /api/games/?page=N   -> { count, next, previous, results: [Game] }
GET /api/games/<slug>/   -> Game
GET /api/genres/         -> { count, next, previous, results: [Genre] }
GET /api/developers/     -> { count, next, previous, results: [Developer] }
```

Фильтры списка игр (`django-filter`, `backend/api/filters.py`):

```
GET /api/games/?genres=rpg&genres=action&developer=fromsoftware
                &year_from=2015&year_to=2020&search=witcher&page=1
```

`Game`: `id, title, slug, release_year, developer {id,name,slug},
genres [{id,name,slug}], description, cover (абсолютный или относительный URL)`.
`Genre` и `Developer`: `id, name, slug`.

- Пагинация — DRF `PageNumberPagination`, `PAGE_SIZE = 12`; ссылка на первую
  страницу не содержит `?page=1`.
- Логика фильтров: между группами — «И», внутри `genres`/`developer` — «ИЛИ».
  Неизвестный slug или нечисловой год → `400`.
- Параметра `ordering` нет: игры по умолчанию отсортированы по `title`.
  Сортировку по году фронтенд делает сам — догружает все страницы уже
  отфильтрованного результата (`getCatalogGames`) и нарезает их по 12.
- Запросы идут `cache: "no-store"`, каталог всегда показывает свежие данные;
  готовые ответы кэшируются в памяти процесса на 60 секунд.

## Модель данных и правила

- `Developer` и `Genre`: `name` (уникальное) + автогенерируемый `slug`.
- `Game`: `title`, `slug`, `release_year` (≥ 1950, индексирован), FK `developer`
  (`on_delete=PROTECT`, `related_name="games"`), M2M `genres` (`blank=True`),
  `description`, `cover` (`games/covers/`), `created_at`.
- Сортировка: игры по `title`, студии и жанры по `name`.
- `unique_slug()` (в `models.py`) делает slug из названия через
  `slugify(..., allow_unicode=True)` и добавляет `-2`, `-3` при коллизиях.
  Slug создаётся только при первом сохранении: переименование не меняет slug,
  поэтому URL игры остаётся стабильным.
- Миграции: `backend/api/migrations/` (0001 — игры/студии, 0002 — жанры).
  После изменения моделей: `manage.py makemigrations api && manage.py migrate`.

## Соглашения

- Server Components по умолчанию; клиентских компонентов нет, кроме
  `app/error.tsx` (нужен `"use client"` ради `reset`).
- Данные из API — только через функции из `lib/api.ts`. При изменении
  сериализаторов обновите типы там же, чтобы TS-контракт не разъезжался.
- `params` и `searchParams` в Next 16 — это `Promise`, их нужно `await`
  (см. `CatalogResults`, `CatalogFilters` и `GameDetails`).
- Фильтры каталога — обычная GET-форма, состояние живёт в URL:
  `genres` (можно несколько), `developer`, `year_from`, `year_to`, `search`,
  `sort`, `page`. Имена первых пяти совпадают с параметрами API; `sort`
  понимает только фронтенд.
- Строка поиска живёт вне формы сайдбара и связана с ней атрибутом
  `form={FILTER_FORM_ID}` (константа в `FilterSidebar.tsx`), поэтому поиск
  применяется вместе с фильтрами. Неконтролируемые поля сбрасываются через
  `key`, иначе при мягкой навигации (сброс, «назад») в них остаются старые
  значения.
- Ошибки API: `ApiError` с `status` (0 — сеть недоступна, 404 — нет игры/страницы).
- Стили — Tailwind-утилиты прямо в JSX; тёмная тема через `prefers-color-scheme`
  и `dark:`-классы. Глобальные токены — `app/globals.css`.
- Обложки: `resolveCoverUrl()` превращает относительный путь в абсолютный;
  домен для `next/image` берётся из `API_URL` в `next.config.ts`, поэтому при
  смене домена бэкенда меняется только переменная окружения.
- Переменная окружения фронтенда: `API_URL` (по умолчанию
  `http://127.0.0.1:8000`). Префикс `NEXT_PUBLIC_` не нужен: запросы серверные,
  CORS на бэкенде не требуется.
- Стиль коммитов в истории: префикс с заглавной буквы (`Feat: ...`,
  `security: ...`).

## Подводные камни

- `DEBUG = True` и `ALLOWED_HOSTS = ["*"]` захардкожены — это dev-конфигурация,
  для продакшена нужен отдельный settings/переменные.
- SimpleJWT подключён в `DEFAULT_AUTHENTICATION_CLASSES`, а дефолтные права —
  `IsAuthenticated`; `GameViewSet` явно ставит `AllowAny`. Любой новый viewset
  без явных `permission_classes` будет закрыт для анонимов.
- JWT установлен, но эндпоинтов выдачи токенов в `urls.py` нет.
- `django-cors-headers` в зависимостях и middleware, но `CORS_ALLOWED_ORIGINS`
  не задан — при переходе на клиентские запросы к API его придётся настроить.
- `psycopg2-binary` есть в `requirements.txt`, хотя используется SQLite.
  Версии Python-зависимостей не зафиксированы.
- `frontend/node_modules` в репозитории отсутствует: перед работой с фронтендом
  выполните `npm install`, иначе не будет ни типов Next, ни документации.
- Текущая `db.sqlite3` пустая (0 игр), папки `backend/media/` ещё нет —
  она создастся при первой загрузке обложки. Для наполнения используйте
  `/admin/`.
- Домены обложек ограничены `remotePatterns` (`/media/**`) и
  `dangerouslyAllowLocalIP` для локальных адресов: если обложки начнут
  отдаваться с другого хоста/пути, правьте `next.config.ts`.
- `PAGE_SIZE` (12) в настройках DRF и `CATALOG_PAGE_SIZE` в
  `frontend/lib/api.ts` связаны вручную: при изменении размера страницы
  обновите оба места (скелетон каталога берёт константу из `lib/api.ts`).
