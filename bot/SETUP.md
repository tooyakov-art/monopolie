# Монополие Бот — Установка за 5 минут

## Шаг 1: Telegram Bot (2 мин)
1. Открой @BotFather в Telegram
2. `/newbot` → назови "Монополие"
3. Скопируй токен (формат: `123456:ABC-DEF...`)

## Шаг 2: GitHub Token (1 мин)
1. github.com → Settings → Developer settings → Personal access tokens → Fine-grained
2. Создай токен с доступом к репо `monopolie` (Contents: Read and Write)
3. Скопируй токен

## Шаг 3: Деплой на Cloudflare Workers (2 мин)
```bash
# Установи wrangler (один раз)
npm i -g wrangler

# Залогинься
wrangler login

# Из папки bot/
cd bot
wrangler deploy

# Добавь секреты
wrangler secret put TELEGRAM_TOKEN
wrangler secret put GITHUB_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

## Шаг 4: Подключи Webhook
После деплоя wrangler покажет URL (типа `https://monopolie-bot.xxx.workers.dev`).

Открой в браузере:
```
https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/setWebhook?url=https://monopolie-bot.xxx.workers.dev
```

## Готово!

Напиши боту `/start` — он покажет твой chat_id.
Добавь его как TELEGRAM_CHAT_ID секрет.

## Использование

| Команда | Что делает |
|---------|-----------|
| `+50000 вайб` | Добавить 50К в VibeCoder |
| `+50000 сайты каспи` | Добавить с источником |
| `/stats` | Показать статистику |
| `/content done` | +1 контент сегодня |
| `/subs 150 вайб` | +150 подписчиков |
| `/reset today` | Сбросить дневные счётчики |

### Алиасы ниш
- вайб/код/vibe → VibeCoder
- сайты/сайт/sites → AI Sites
- приложения/прилы/apps → AI Apps
- боты/бот/bots → AI Bots
- контент/текст/content → AI Content
- дизайн/диз/design → AI Design
- продукт/saas → AI SaaS

### Каспи уведомления
Пересылай уведомления от Каспи боту — он распарсит сумму и спросит нишу.
