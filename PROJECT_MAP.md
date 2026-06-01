# PROJECT MAP — CRM Мягкие окна

## Назначение

Коммерческое веб-приложение CRM-конструктор для производителей мягких окон и дверей.
Заказчик. Трёхэтапная разработка. Сдача Этапа 1 — конец текущей недели (2026-06-01).

Референс заказчика: `8.html` — рабочий прототип со всей бизнес-логикой, SVG-визуализацией,
11 типами изделий, CRM на localStorage. Используется как справочник для Этапа 2.

---

## Стек (точные версии)

### Фронтенд (`kalkyl/` root)

| Пакет | Версия |
|---|---|
| Node.js | 22.17.0 |
| Vite | ^8.0.12 (rolldown bundler) |
| React | ^19.2.6 |
| react-router-dom | ^7.16.0 |
| zustand | ^5.0.14 |
| axios | ^1.16.1 |
| TypeScript | ~6.0.2 |
| Tailwind CSS | ^3.4.19 |
| concurrently | ^10.0.1 |

### Бекенд (`backend/`)

| Пакет | Версия |
|---|---|
| express | ^5.2.1 |
| prisma | 5.22.0 (стабильный, НЕ 7) |
| @prisma/client | 5.22.0 |
| bcryptjs | ^3.0.3 (pure JS, без нативных биндингов) |
| jsonwebtoken | ^9.0.3 |
| cors | ^2.8.6 |
| helmet | ^8.2.0 |
| express-rate-limit | ^8.5.2 |
| zod | ^4.4.3 |
| tsx | (dev, запускает TS без компиляции) |

---

## Структура файлов

```
kalkyl/
├── README.md
├── PROJECT_MAP.md
├── package.json               # скрипты: dev, dev:backend, dev:all, build
├── vite.config.ts             # server.host = '127.0.0.1'
├── tailwind.config.js
├── 8.html                     # РЕФЕРЕНС заказчика. НЕ ТРОГАТЬ до Этапа 2
├── src/
│   ├── main.tsx
│   ├── App.tsx                # BrowserRouter + Routes + ProtectedRoute/GuestRoute
│   ├── index.css              # @tailwind directives
│   ├── types/window.ts        # Dimensions, WoodType (резерв для Этапа 2)
│   ├── api/
│   │   ├── client.ts          # axios + Bearer token interceptor
│   │   └── auth.ts            # apiLogin, apiRegister, apiMe
│   ├── store/
│   │   └── authStore.ts       # zustand + persist: { user, token, login, logout }
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx
│   └── components/
│       ├── auth/
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       └── layout/
│           ├── AppLayout.tsx  # топбар + flex row сайдбар/центр/правая панель
│           ├── Sidebar.tsx    # Заказы, "+ Добавить" (alert-заглушка)
│           ├── MainContent.tsx# Конструктор изделия (заглушка)
│           └── ClientPanel.tsx# Данные клиента (disabled форма)
└── backend/
    ├── package.json           # "type": "commonjs"
    ├── tsconfig.json          # CommonJS, ignoreDeprecations: "6.0"
    ├── .env                   # DATABASE_URL, JWT_SECRET, PORT=3001 (НЕ в git)
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma      # 5 моделей: User, Client, Order, OrderItem, PriceList
    │   └── migrations/        # создаётся после `prisma migrate dev`
    └── src/
        ├── index.ts           # Express 5, helmet, cors(5173), rate-limit, /api/health
        ├── lib/
        │   └── prisma.ts      # PrismaClient singleton
        ├── middleware/
        │   └── checkAuth.ts   # JWT Bearer → req.userId
        └── routes/
            └── auth.ts        # POST /register, POST /login, GET /me

```

---

## API (Этап 1)

| Метод | Путь | Защита | Описание |
|---|---|---|---|
| POST | /api/auth/register | — | Регистрация → JWT |
| POST | /api/auth/login | — | Вход → JWT |
| GET | /api/auth/me | Bearer | Текущий пользователь |
| GET | /api/health | — | Health check |

---

## Архитектурные решения

- **Prisma 5.22** намеренно — Prisma 7 требует driver adapter или Accelerate URL,
  несовместима с традиционным DATABASE_URL в конструкторе PrismaClient.
- **bcryptjs** вместо bcrypt — нет нативных биндингов, работает на Windows без MSVC/node-gyp.
- **JWT хранится в localStorage** (через zustand persist) — достаточно для MVP.
  На продакшне можно переключить на httpOnly cookie.
- **Express 5** — автоматически форвардит async ошибки в error handler.
- **Цветовая схема**: Slate/Blue. Хедер `#1e293b`, акцент `#2563eb`, фон `#f8fafc`, карточки `#ffffff`, бордюры `#e2e8f0`, текст `#0f172a`/`#64748b`. Шрифт: Inter.
- **Шрифт**: Inter (Google Fonts) — подключён в `index.css`, прописан в `tailwind.config.js`.
- **Vite server.host = '127.0.0.1'** — фикс IPv6 на Windows 10 (ERR_CONNECTION_REFUSED).

---

## Известные нюансы

- **IDE Prisma warning**: расширение VSCode обновилось до Prisma 7, поэтому подсвечивает
  `url = env("DATABASE_URL")` как ошибку. Это косметика — Prisma 5 CLI работает корректно.
- **react-router-dom v7**: используется library mode (BrowserRouter + Routes), не framework mode.
- **zustand v5**: API совместим с v4 для базовых кейсов.

---

## Сессии

### Сессия 1 (до компакции контекста)
- Создан конструктор окна (слайдеры, Konva-холст с деревянной рамой)
- Деревянная рама с 3D-эффектом (градиенты, волокна, фаска, тень)
- Переключатель см/мм, порода дерева (Дуб/Сосна/Орех), адаптив

### Сессия 2 (текущая — 2026-06-01)
- Смена концепции: из конструктора → полноценное CRM-ПО
- Удалены: WindowConstructor, ControlsPanel, WindowCanvas
- Реализован Этап 1: бекенд авторизации + фронт с роутингом
- Prisma 7 → downgrade до Prisma 5.22 (несовместимость API)

---

## Что НЕ входит в текущий этап (Этап 2)

- SVG-конструктор (логика из 8.html)
- Управление заказами (CRUD)
- CRM: клиенты, статусы, поиск
- Прайс-лист (розница/опт)
- Экспорт PDF/TXT
- Розница vs опт переключатель

---

## Команды

```bash
# Из kalkyl/
npm run dev:all              # запустить фронт + бекенд одновременно
npm run dev                  # только фронт
npm run dev:backend          # только бекенд

# Из kalkyl/backend/
npx prisma migrate dev --name init   # первая миграция (нужна реальная БД)
npx prisma studio                    # GUI для БД
```

> Фронт: http://127.0.0.1:5173/ | Бекенд: http://127.0.0.1:3001/
