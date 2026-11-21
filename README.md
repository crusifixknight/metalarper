# Metalarper

## Цель проекта

Сайт каталога видео игр, который позволяет узнать информацию об играх и что о ней думают другие.

## Что внутри

- `backend/` — Django + Django REST Framework: публичное read-only API каталога
  игр (список с фильтрами и пагинацией, деталь по slug, справочники жанров и
  студий) и API регистрации пользователей. Контент заводится через
  Django-админку.
- `frontend/` — Next.js 16 (App Router, Server Components) + Tailwind CSS 4:
  каталог с фильтрами, поиском и сортировкой, карточка игры. Запросы к API
  выполняются только на сервере.

## Требования

- Python 3.13+ (в CI используется 3.13; в репозитории уже есть `.venv/`).
- Node.js 20.9+ и npm.
- Команды ниже даны для PowerShell (Windows).

## Backend

Из корня репозитория:

```powershell
Copy-Item backend/.env.example backend/.env
# откройте backend/.env и задайте SECRET_KEY

.venv\Scripts\python.exe backend\manage.py migrate
.venv\Scripts\python.exe backend\manage.py createsuperuser
.venv\Scripts\python.exe backend\manage.py runserver
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

Игры, жанры и студии добавляются в админке после `createsuperuser`.

## Аутентификация

- `POST /api/auth/register/` — регистрация: `username`, `email`, `password`,
  `password_confirm`; возвращает пользователя и JWT-пару `access`/`refresh`.
- `POST /api/auth/login/` — вход: `username`, `password`; возвращает
  пользователя и JWT-пару.
- `POST /api/auth/refresh/` — новый `access` по `refresh`.

Неверные учётные данные дают одинаковый `401` (`invalid_credentials`).
Logout/blacklist пока не реализованы.

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
