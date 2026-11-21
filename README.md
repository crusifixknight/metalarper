# УПП 24.1_3

# Metalarper

## Цель проекта

Сайт каталога видео игр, который позволяет узнать информацию об играх и что о ней думают другие.

## Что внутри

- `backend/` — Django + Django REST Framework: публичное read-only API каталога
  игр (список с фильтрами и пагинацией, деталь по slug, справочники жанров и
  студий, Steam-данные на карточке), API аутентификации (регистрация, вход,
  обновление токена) и кэш Steam-данных. Контент заводится через
  Django-админку.
- `frontend/` — Next.js 16 (App Router, Server Components) + Tailwind CSS 4:
  каталог с фильтрами, поиском и сортировкой, панель входа и регистрации в
  шапке, страница игры с рейтингом, возрастом, связанными и похожими играми.
  Запросы к API выполняются только на сервере.

## Требования

- Python 3.13+ (в CI используется 3.13; в репозитории уже есть `.venv/`).
- Node.js 20.9+ и npm.
- Команды ниже даны для PowerShell (Windows).

## Backend

Из корня репозитория:

```powershell
Copy-Item backend/.env.example backend/.env
# откройте backend/.env и задайте SECRET_KEY

.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.venv\Scripts\python.exe backend\manage.py migrate
.venv\Scripts\python.exe backend\manage.py createsuperuser
.venv\Scripts\python.exe backend\manage.py runserver

# опционально: заранее заполнить кэш Steam (игроки, рейтинг, дата новости)
.venv\Scripts\python.exe backend\manage.py refresh_steam
```

Без `SECRET_KEY` в `backend/.env` приложение не запустится
(`ImproperlyConfigured`). Миграции и тесты используют SQLite
(`backend/db.sqlite3`), отдельная СУБД не нужна.

## Frontend

В отдельном терминале:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local   # опционально: значения по умолчанию совпадают
npm run dev
```

## Адреса после запуска

| Что | Адрес |
| --- | --- |
| Каталог игр | `http://localhost:3000` |
| Карточка игры | `http://localhost:3000/games/<slug>` |
| API каталога | `http://127.0.0.1:8000/api/games/` |
| API регистрации | `POST http://127.0.0.1:8000/api/auth/register/` |
| API входа | `POST http://127.0.0.1:8000/api/auth/login/` |
| Обновление токена | `POST http://127.0.0.1:8000/api/auth/refresh/` |
| Django-админка | `http://127.0.0.1:8000/admin/` |
| Обложки игр | `http://127.0.0.1:8000/media/games/covers/...` |

В админке после `createsuperuser` добавляются игры, жанры и студии, а также
возрастной рейтинг, Steam AppID и связанные игры. Кэш `SteamSnapshot`
заполняется автоматически и доступен только для чтения.

## Аутентификация

- `POST /api/auth/register/` — регистрация: `username`, `email`, `password`,
  `password_confirm`; возвращает пользователя и JWT-пару `access`/`refresh`.
- `POST /api/auth/login/` — вход: `username`, `password`; возвращает
  пользователя и JWT-пару.
- `POST /api/auth/refresh/` — новый `access` по `refresh`.

Неверные учётные данные дают одинаковый `401` (`invalid_credentials`).
Logout/blacklist пока не реализованы.

В интерфейсе вход и регистрация открываются из панели в шапке сайта. Токены
хранятся в HttpOnly cookies (`ml_access`, `ml_refresh`) и не попадают в
браузерный JavaScript: access живёт 30 минут, refresh — 1 день, продление
выполняет `frontend/proxy.ts` до отрисовки страницы.

## Steam-данные

Если у игры заполнен `steam_appid`, карточка получает текущее число игроков,
рейтинг по отзывам (0–5 звёзд) и дату последней новости. API никогда не ждёт
Steam: данные отдаются из кэша `SteamSnapshot` и обновляются в фоне раз в
15 минут.

- При холодном кэше поля `steam` приходят как `null` с `is_stale: true` —
  данные появятся после фонового обновления, это нормальное поведение.
- Ручное обновление: `manage.py refresh_steam` (флаг `--force` обновляет все
  снимки, даже свежие).
- Возрастной рейтинг (`age_rating`) Steam не отдаёт — он вводится в админке
  вручную.

## Проверки

```powershell
cd backend; ..\.venv\Scripts\python.exe manage.py check
cd backend; ..\.venv\Scripts\python.exe manage.py test api
cd frontend; npm run lint
cd frontend; npm run build
```

Тесты есть только на бэкенде (`backend/api/tests.py`).

## Документация

- `AGENTS.md` — контекст проекта и правила работы для AI-агентов.
- `frontend/README.md` — устройство фронтенда, интеграция с API и фильтры.
