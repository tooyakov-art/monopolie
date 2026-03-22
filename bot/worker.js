// Монополие Telegram Bot — Cloudflare Worker
// Трекает доходы, обновляет data.json на GitHub Pages
//
// ENV переменные (в Cloudflare Dashboard → Settings → Variables):
//   TELEGRAM_TOKEN  — токен от @BotFather
//   GITHUB_TOKEN    — Personal Access Token (repo scope)
//   TELEGRAM_CHAT_ID — твой chat_id (бот покажет при /start)

const REPO = 'tooyakov-art/monopolie';
const DATA_PATH = 'api/data.json';
const BRANCH = 'master';

const NICHE_ALIASES = {
  'apps': 'ai-apps', 'app': 'ai-apps', 'приложения': 'ai-apps', 'прилы': 'ai-apps',
  'sites': 'ai-sites', 'site': 'ai-sites', 'сайты': 'ai-sites', 'сайт': 'ai-sites',
  'bots': 'ai-bots', 'bot': 'ai-bots', 'боты': 'ai-bots', 'бот': 'ai-bots',
  'vibe': 'vibecoder', 'vibecoder': 'vibecoder', 'вайб': 'vibecoder', 'код': 'vibecoder',
  'content': 'ai-content', 'контент': 'ai-content', 'текст': 'ai-content',
  'design': 'ai-design', 'дизайн': 'ai-design', 'диз': 'ai-design',
  'saas': 'ai-saas', 'сас': 'ai-saas', 'продукт': 'ai-saas',
};

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Монополие Bot 🏴‍☠️', { status: 200 });
    }

    const update = await request.json();
    const msg = update.message;
    if (!msg || !msg.text) return new Response('ok');

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Проверка авторизации
    if (env.TELEGRAM_CHAT_ID && String(chatId) !== String(env.TELEGRAM_CHAT_ID)) {
      await sendTg(env, chatId, '⛔ Нет доступа');
      return new Response('ok');
    }

    try {
      // /start
      if (text === '/start') {
        await sendTg(env, chatId,
          `🏴‍☠️ *МОНОПОЛИЕ БОТ*\n\n` +
          `Твой chat\\_id: \`${chatId}\`\n\n` +
          `*Команды:*\n` +
          `💰 \`+50000 вайб\` — добавить доход\n` +
          `💰 \`+50000 сайты касли\` — с источником\n` +
          `📊 \`/stats\` — текущие цифры\n` +
          `📝 \`/content done\` — +1 контент\n` +
          `👥 \`/subs 150 вайб\` — подписчики\n` +
          `🔄 \`/reset today\` — сбросить "сегодня"\n\n` +
          `Или просто пересылай уведомления от Каспи!`
        );
        return new Response('ok');
      }

      // /stats
      if (text === '/stats') {
        const data = await getData(env);
        const niches = data.niches.map(n =>
          `${n.icon} ${n.name}: ${n.display} ₸`
        ).join('\n');
        await sendTg(env, chatId,
          `📊 *МОНОПОЛИЕ*\n\n` +
          `💰 Итого: *${data.total.display}*\n` +
          `📅 Сегодня: *${fmt(data.today.amount)} ₸*\n` +
          `👥 Подписчики: +${data.subscribers.new} (${fmt(data.subscribers.total)})\n` +
          `📝 Контент: ${data.content.done}/${data.content.total}\n\n` +
          `*По нишам:*\n${niches}\n\n` +
          `🎯 Цель: ${fmt(data.goal.current)} / ${fmt(data.goal.target)} ₸ (${((data.goal.current/data.goal.target)*100).toFixed(1)}%)`
        );
        return new Response('ok');
      }

      // /content done — +1 контент
      if (text.toLowerCase().startsWith('/content')) {
        const data = await getData(env);
        data.content.done = Math.min(data.content.done + 1, data.content.total);
        data.updated = new Date().toISOString();
        await saveData(env, data, `content: ${data.content.done}/${data.content.total}`);
        await sendTg(env, chatId, `📝 Контент: ${data.content.done}/${data.content.total} ✅`);
        return new Response('ok');
      }

      // /subs 150 вайб
      if (text.toLowerCase().startsWith('/subs')) {
        const parts = text.split(/\s+/);
        const count = parseInt(parts[1]);
        const nicheAlias = parts[2]?.toLowerCase();
        if (!count || !nicheAlias) {
          await sendTg(env, chatId, '❌ Формат: `/subs 150 вайб`');
          return new Response('ok');
        }
        const nicheId = NICHE_ALIASES[nicheAlias];
        if (!nicheId) {
          await sendTg(env, chatId, `❌ Ниша "${nicheAlias}" не найдена\n\nДоступные: ${Object.keys(NICHE_ALIASES).join(', ')}`);
          return new Response('ok');
        }
        const data = await getData(env);
        const niche = data.niches.find(n => n.id === nicheId);
        niche.subs += count;
        data.subscribers.new += count;
        data.subscribers.total += count;
        data.updated = new Date().toISOString();
        await saveData(env, data, `subs: +${count} ${niche.name}`);
        await sendTg(env, chatId, `👥 ${niche.icon} ${niche.name}: +${count} подписчиков (${fmt(niche.subs)} всего) ✅`);
        return new Response('ok');
      }

      // /reset today
      if (text.toLowerCase().startsWith('/reset today')) {
        const data = await getData(env);
        data.today.amount = 0;
        data.today.change = 0;
        data.subscribers.new = 0;
        data.content.done = 0;
        data.updated = new Date().toISOString();
        await saveData(env, data, 'reset today');
        await sendTg(env, chatId, '🔄 Сегодня сброшено ✅');
        return new Response('ok');
      }

      // Парсинг Каспи уведомлений (пересланные сообщения)
      const kaspiMatch = text.match(/(\d[\d\s,.]+)\s*[₸тенге]/i) ||
                         text.match(/перевод[:\s]+(\d[\d\s,.]+)/i) ||
                         text.match(/поступлени[ея][:\s]+(\d[\d\s,.]+)/i) ||
                         text.match(/зачислен[оа]?[:\s]+(\d[\d\s,.]+)/i);

      // +50000 вайб [каспи]
      const incomeMatch = text.match(/^\+?\s*(\d[\d\s,.]*\d?)\s+(\S+)(?:\s+(.+))?$/i);

      if (kaspiMatch) {
        // Каспи уведомление — пока без ниши, спрашиваем
        const amount = parseAmount(kaspiMatch[1]);
        await sendTg(env, chatId,
          `💰 Поступление: *${fmt(amount)} ₸*\n\n` +
          `Какая ниша? Отправь:\n` +
          `\`+${amount} вайб\`\n` +
          `\`+${amount} сайты\`\n` +
          `\`+${amount} боты\`\netc.`
        );
        return new Response('ok');
      }

      if (incomeMatch) {
        const amount = parseAmount(incomeMatch[1]);
        const nicheAlias = incomeMatch[2].toLowerCase();
        const source = incomeMatch[3] || 'manual';

        const nicheId = NICHE_ALIASES[nicheAlias];
        if (!nicheId) {
          await sendTg(env, chatId,
            `❌ Ниша "${nicheAlias}" не найдена\n\n` +
            `Доступные: вайб, сайты, приложения, боты, контент, дизайн, продукт`
          );
          return new Response('ok');
        }

        const data = await getData(env);
        const niche = data.niches.find(n => n.id === nicheId);

        // Обновляем
        niche.amount += amount;
        niche.display = fmt(niche.amount);
        data.total.amount += amount;
        data.total.display = fmt(data.total.amount) + ' ₸';
        data.total.usd = Math.round(data.total.amount / 490);
        data.today.amount += amount;
        data.goal.current = data.total.amount;
        data.goal.percent = parseFloat(((data.total.amount / data.goal.target) * 100).toFixed(2));
        data.updated = new Date().toISOString();

        // Пересчитываем change
        const prevMonth = data.months[data.months.length - 2]?.amount || 1;
        data.total.change = parseFloat(((data.total.amount / prevMonth - 1) * 100).toFixed(1));

        // Обновляем текущий месяц в истории
        data.months[data.months.length - 1].amount = data.total.amount;

        await saveData(env, data, `+${fmt(amount)} ${niche.name} (${source})`);

        const goalPct = ((data.total.amount / data.goal.target) * 100).toFixed(1);
        await sendTg(env, chatId,
          `✅ *+${fmt(amount)} ₸* → ${niche.icon} ${niche.name}\n\n` +
          `💰 Итого: *${fmt(data.total.amount)} ₸*\n` +
          `📅 Сегодня: *${fmt(data.today.amount)} ₸*\n` +
          `🎯 Цель: ${goalPct}%\n` +
          `📍 Источник: ${source}`
        );
        return new Response('ok');
      }

      // Неизвестная команда
      await sendTg(env, chatId,
        `🤔 Не понял. Примеры:\n\n` +
        `\`+50000 вайб\` — доход\n` +
        `\`+50000 сайты каспи\` — с источником\n` +
        `\`/stats\` — статистика\n` +
        `\`/content done\` — +1 контент`
      );

    } catch (err) {
      await sendTg(env, chatId, `❌ Ошибка: ${err.message}`);
    }

    return new Response('ok');
  }
};

// --- Helpers ---

function parseAmount(str) {
  return parseInt(str.replace(/[\s,.]/g, '')) || 0;
}

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.?0+$/, '') + 'K';
  return n.toString();
}

async function sendTg(env, chatId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}

async function getData(env) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Monopolie-Bot',
    },
  });
  const file = await res.json();
  const content = atob(file.content.replace(/\n/g, ''));
  const data = JSON.parse(content);
  data._sha = file.sha;
  return data;
}

async function saveData(env, data, commitMsg) {
  const sha = data._sha;
  delete data._sha;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Monopolie-Bot',
    },
    body: JSON.stringify({
      message: `📊 ${commitMsg}`,
      content: content,
      sha: sha,
      branch: BRANCH,
    }),
  });
}
