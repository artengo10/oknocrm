# CRM Мягкие окна — Этап 1: Фундамент

## Быстрый старт

### 1. Настрой базу данных PostgreSQL

Создай БД, например:
```sql
CREATE DATABASE okno_crm;
```

### 2. Настрой переменные окружения (бекенд)

```bash
cd backend
copy .env.example .env
```

Открой `backend/.env` и заполни:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/okno_crm?schema=public"
JWT_SECRET="вставь_сюда_сгенерированный_ключ"
PORT=3001
```

Сгенерировать JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Примени миграции

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Запусти оба сервера одновременно

```bash
# из папки kalkyl/
npm run dev:all
```

Или раздельно в двух терминалах:
```bash
# Терминал 1 (фронт)
npm run dev

# Терминал 2 (бекенд)
npm run dev:backend
```

### 5. Открой в браузере

- Фронт: http://127.0.0.1:5173/
- Бекенд API: http://127.0.0.1:3001/api/health

---

## Что работает в Этапе 1

- Регистрация (`/register`) — email + пароль ≥ 8 символов
- Вход (`/login`) — JWT токен на 7 дней в localStorage
- Защищённый dashboard (`/`) — редирект на `/login` если нет токена
- Layout: верхняя полоска с email + кнопка Выйти, левый сайдбар Заказы, центр-заглушка, правая панель клиента

## Что НЕ входит в Этап 1 (будет в Этапе 2)

- Конструктор изделия и SVG-визуализация
- Работа с заказами и позициями
- CRM логика (статусы, клиенты из БД)
- Калькуляция стоимости
- Прайс-лист
- PDF/TXT экспорт

---

## Структура проекта

```
kalkyl/
├── src/                        # Фронтенд React
│   ├── api/                    # axios клиент + функции авторизации
│   ├── store/                  # zustand (токен + user)
│   ├── hooks/                  # useAuth
│   ├── pages/                  # LoginPage, RegisterPage, DashboardPage
│   └── components/
│       ├── auth/               # LoginForm, RegisterForm
│       └── layout/             # AppLayout, Sidebar, MainContent, ClientPanel
├── backend/                    # Node.js API
│   ├── src/
│   │   ├── index.ts            # Express entry point (порт 3001)
│   │   ├── routes/auth.ts      # POST /api/auth/register, /login, GET /me
│   │   ├── middleware/         # checkAuth JWT middleware
│   │   └── lib/prisma.ts       # Prisma singleton
│   ├── prisma/schema.prisma    # БД схема (5 моделей)
│   ├── .env                    # секреты (НЕ в git)
│   └── .env.example            # шаблон
└── package.json                # скрипты dev:all, dev:backend
```

## IDE предупреждение в schema.prisma

Если расширение Prisma в VSCode подсвечивает строку `url = env("DATABASE_URL")` как ошибку —
это нормально: расширение обновилось до Prisma 7, а в проекте используется Prisma 5 (стабильная).
Код работает корректно, предупреждение можно игнорировать.
