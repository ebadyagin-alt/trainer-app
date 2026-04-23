# Trainer App — Приложение для тренера

Веб-приложение для управления клиентами, расписанием, тренировками и финансами.

**Продакшен:** https://trainer-app-production-0c92.up.railway.app  
**Репозиторий:** https://github.com/ebadyagin-alt/trainer-app

---

## Стек

- **Backend:** Node.js + Express
- **База данных:** PostgreSQL (Supabase)
- **Хостинг:** Railway (авто-деплой из GitHub)
- **Frontend:** Vanilla HTML/CSS/JS

---

## Функции

### Панель тренера (`/`)

| Раздел | Что можно делать |
|--------|-----------------|
| 📅 Расписание | Недельный вид, создать/удалить запись, статусы |
| 👥 Клиенты | Добавить/редактировать/удалить, просмотр карточки, ссылка-приглашение |
| 🏋️ Тренировки | Лог упражнений (подходы, повторения, вес), фильтр по клиенту |
| 💰 Финансы | Платежи, статус оплаты, итого за месяц, сумма долга |

### Портал клиента (`/client/:token`)

Клиент открывает персональную ссылку и видит:
- Свои предстоящие и прошедшие записи
- Историю тренировок с упражнениями
- Свои платежи и статус оплаты
- Форму записи к тренеру (статус «Ожидает подтверждения»)

---

## Статусы записей

| Цвет | Статус | Описание |
|------|--------|----------|
| 🟣 Фиолетовый | Подтверждено | Тренер подтвердил |
| 🟡 Жёлтый | Ожидает подтверждения | Клиент записался сам |
| 🟢 Зелёный | Проведено | Тренировка состоялась |
| 🔴 Красный | Отменено | Запись отменена |

---

## Как пригласить клиента

1. Перейдите в раздел **Клиенты**
2. В карточке клиента нажмите **🔗 Ссылка**
3. Ссылка скопируется в буфер обмена
4. Отправьте клиенту (WhatsApp, Telegram, email)

Ссылка вида: `https://trainer-app-production-0c92.up.railway.app/client/ТОКЕН`

---

## Локальный запуск

### 1. Установка

```bash
git clone https://github.com/ebadyagin-alt/trainer-app.git
cd trainer-app
npm install
```

### 2. Настройка базы данных

Создайте файл `.env`:

```
DATABASE_URL=postgresql://postgres.ooiiopzmcokntkkbhkxs:[ПАРОЛЬ]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
PORT=3000
```

### 3. Запуск

```bash
node server.js
```

Открыть: http://localhost:3000

---

## Деплой на Railway

Деплой происходит **автоматически** при каждом `git push`:

```bash
git add .
git commit -m "описание изменений"
git push
```

Railway подхватит изменения и обновит сайт за 1-2 минуты.

### Переменные окружения в Railway

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Строка подключения Supabase (pooler, порт 6543) |
| `PORT` | `3000` |

---

## API

### Клиенты
```
GET    /api/clients          — список всех клиентов
POST   /api/clients          — создать клиента
GET    /api/clients/:id      — получить клиента
PUT    /api/clients/:id      — обновить клиента
DELETE /api/clients/:id      — удалить клиента (каскадно)
```

### Расписание
```
GET    /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD  — записи за период
POST   /api/appointments     — создать запись
PUT    /api/appointments/:id — обновить запись
DELETE /api/appointments/:id — удалить запись
```

### Тренировки
```
GET    /api/sessions                    — все тренировки
GET    /api/sessions/client/:clientId   — тренировки клиента
POST   /api/sessions                    — добавить тренировку
DELETE /api/sessions/:id                — удалить тренировку
```

### Финансы
```
GET    /api/payments          — все платежи
GET    /api/payments/summary  — итого за месяц + долг
POST   /api/payments          — добавить платёж
PUT    /api/payments/:id      — обновить платёж
DELETE /api/payments/:id      — удалить платёж
```

### Портал клиента
```
GET  /api/portal/:token                    — данные клиента (записи, тренировки, платежи)
POST /api/portal/:token/appointments       — клиент записывается сам
GET  /client/:token                        — страница портала клиента
```

---

## Структура файлов

```
trainer-app/
├── server.js          # Express сервер + все API маршруты
├── database.js        # Работа с PostgreSQL
├── package.json
├── .env               # Локальные переменные (не в git)
├── .env.example       # Пример переменных
└── public/
    ├── index.html     # Панель тренера
    ├── style.css      # Стили панели тренера
    ├── app.js         # Логика панели тренера
    ├── client.html    # Портал клиента
    ├── client.css     # Стили портала клиента
    └── client.js      # Логика портала клиента
```

---

## База данных (схема)

```sql
clients      — id, name, phone, email, goals, notes, invite_token, created_at
appointments — id, client_id, date, time, duration, status, notes
sessions     — id, client_id, appointment_id, date, exercises (JSONB), notes
payments     — id, client_id, amount, date, description, paid
```
