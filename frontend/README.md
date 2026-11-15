# Metalarper — фронтенд каталога игр

Next.js 16 (App Router, Cache Components) + Tailwind CSS 4. Данные приходят из
Django REST API, который лежит в соседней папке `../backend`.

## Запуск

### 1. Бэкенд

```powershell
cd backend
Copy-Item .env.example .env   # и заполните SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API будет доступно на `http://127.0.0.1:8000/api/games/` (12 игр на страницу),
обложки — на `http://127.0.0.1:8000/media/...`.

### 2. Фронтенд

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local   # опционально, значения по умолчанию совпадают
npm run dev
```

Каталог: `http://localhost:3000`, карточка игры: `/games/<slug>`.

## Как устроена интеграция

- `lib/api.ts` — типизированный клиент: список с пагинацией, деталь по slug,
  разбор ссылок `next`/`previous` из DRF.
- `app/page.tsx` — статический каркас страницы; список игр стримится внутри
  `<Suspense>`.
- `components/CatalogResults.tsx` — загрузка страницы каталога, пагинация,
  состояния «пусто», «страницы нет» и «API недоступен».
- `components/GameCard.tsx` — карточка из реальных полей API (`cover`,
  `genres`, `release_year`, `developer`).
- `app/games/[slug]/page.tsx` — детальная страница; `404` от API превращается
  в `notFound()`.
- `next.config.ts` — домен обложек берётся из `API_URL` для `next/image`.

Запросы к API выполняются только на сервере (Server Components), поэтому
`API_URL` не публикуется в браузер и настраивать CORS на бэкенде не нужно.
Обложки грузятся напрямую с бэкенда (это обычные `<img>`-запросы, CORS им не
нужен).

Переменная окружения:

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `API_URL` | `http://127.0.0.1:8000` | Базовый адрес Django-бэкенда |

## Ограничения текущего API

Бэкенд поддерживает только список и деталь, без фильтрации и сортировки,
поэтому контролы в сайдбаре отключены. Пагинация работает через `?page=N`
(размер страницы задаёт DRF).
