# Metalarper

## Цель проекта

Сайт каталога видео игр, который позволяет узнать информацию об играх и что о ней думают другие.

## Что внутри

- `backend/` — Django + Django REST Framework: публичное read-only API каталога
  игр (список с фильтрами и пагинацией, деталь по slug, справочники жанров и
  студий). Контент заводится через Django-админку.
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
| Django-админка | `http://127.0.0.1:8000/admin/` |
| Обложки игр | `http://127.0.0.1:8000/media/games/covers/...` |

Игры, жанры и студии добавляются в админке после `createsuperuser`.

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
