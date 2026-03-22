// Монополие Widget для Scriptable (iOS)
// Тянет ЖИВЫЕ данные с GitHub Pages
//
// Установка:
// 1. Скачай Scriptable из App Store
// 2. Создай скрипт, вставь этот код
// 3. Домашний экран → + → Scriptable → выбери размер → выбери скрипт

const API_URL = "https://tooyakov-art.github.io/monopolie/api/data.json";

async function loadData() {
  try {
    const req = new Request(API_URL);
    req.headers = { "Cache-Control": "no-cache" };
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

function formatAmount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/\.?0+$/, '') + "M";
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.?0+$/, '') + "K";
  return n.toString();
}

async function createWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0a0a0f");
  w.setPadding(12, 14, 12, 14);
  // Обновлять каждые 15 минут
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  if (!data) {
    const err = w.addText("⚠ Нет связи");
    err.font = Font.boldSystemFont(14);
    err.textColor = new Color("#ef4444");
    return w;
  }

  // Header
  const header = w.addStack();
  header.centerAlignContent();

  const logoStack = header.addStack();
  logoStack.cornerRadius = 6;
  logoStack.setPadding(2, 6, 2, 6);
  logoStack.backgroundColor = new Color("#a855f7", 0.2);
  const logoText = logoStack.addText("M");
  logoText.font = Font.heavySystemFont(10);
  logoText.textColor = new Color("#a855f7");

  header.addSpacer(6);
  const title = header.addText("МОНОПОЛИЕ");
  title.font = Font.boldSystemFont(11);
  title.textColor = Color.white();

  header.addSpacer();

  // Время обновления
  const updated = new Date(data.updated);
  const timeStr = `${updated.getHours()}:${String(updated.getMinutes()).padStart(2, '0')}`;
  const live = header.addText("● " + timeStr);
  live.font = Font.mediumSystemFont(9);
  live.textColor = new Color("#10b981");

  w.addSpacer(8);

  const family = config.widgetFamily || "medium";

  if (family === "small") {
    // --- SMALL ---
    const label = w.addText("Доход за " + data.month.split(" ")[0].toLowerCase());
    label.font = Font.mediumSystemFont(9);
    label.textColor = new Color("#ffffff", 0.4);

    w.addSpacer(2);
    const amount = w.addText(formatAmount(data.total.amount) + " ₸");
    amount.font = Font.heavySystemFont(24);
    amount.textColor = new Color("#00d4ff");

    const sub = w.addText("≈ $" + data.total.usd.toLocaleString());
    sub.font = Font.mediumSystemFont(10);
    sub.textColor = new Color("#ffffff", 0.4);

    w.addSpacer(4);

    const changeRow = w.addStack();
    const ch = changeRow.addText("+" + data.total.change + "%");
    ch.font = Font.boldSystemFont(12);
    ch.textColor = new Color("#10b981");
    changeRow.addSpacer();
    const td = changeRow.addText("Сегодня: " + formatAmount(data.today.amount) + " ₸");
    td.font = Font.mediumSystemFont(10);
    td.textColor = new Color("#ffffff", 0.5);

    w.addSpacer();

    const goalPct = ((data.goal.current / data.goal.target) * 100).toFixed(1);
    const goalText = w.addText(formatAmount(data.goal.current) + " / " + formatAmount(data.goal.target) + " ₸  (" + goalPct + "%)");
    goalText.font = Font.mediumSystemFont(8);
    goalText.textColor = new Color("#ffffff", 0.3);

  } else {
    // --- MEDIUM / LARGE ---
    const topRow = w.addStack();

    const leftCol = topRow.addStack();
    leftCol.layoutVertically();

    const label = leftCol.addText("Доход · " + data.month);
    label.font = Font.mediumSystemFont(9);
    label.textColor = new Color("#ffffff", 0.4);
    leftCol.addSpacer(1);

    const amount = leftCol.addText(formatAmount(data.total.amount) + " ₸");
    amount.font = Font.heavySystemFont(22);
    amount.textColor = new Color("#00d4ff");

    const sub = leftCol.addText("$" + data.total.usd.toLocaleString() + "  ↑" + data.total.change + "%");
    sub.font = Font.mediumSystemFont(9);
    sub.textColor = new Color("#10b981");

    topRow.addSpacer();

    const rightCol = topRow.addStack();
    rightCol.layoutVertically();

    const tdLabel = rightCol.addText("Сегодня");
    tdLabel.font = Font.mediumSystemFont(9);
    tdLabel.textColor = new Color("#ffffff", 0.4);
    rightCol.addSpacer(1);

    const tdVal = rightCol.addText(formatAmount(data.today.amount) + " ₸");
    tdVal.font = Font.heavySystemFont(18);
    tdVal.textColor = Color.white();

    const tdSub = rightCol.addText("+" + data.today.change + "% vs вчера");
    tdSub.font = Font.mediumSystemFont(9);
    tdSub.textColor = new Color("#10b981");

    w.addSpacer(6);

    // Niches
    const showCount = family === "large" ? data.niches.length : 4;
    const sorted = [...data.niches].sort((a, b) => b.amount - a.amount);

    for (let i = 0; i < Math.min(showCount, sorted.length); i++) {
      const n = sorted[i];
      const row = w.addStack();
      row.centerAlignContent();
      row.spacing = 6;

      const icon = row.addText(n.icon);
      icon.font = Font.mediumSystemFont(11);

      const name = row.addText(n.name);
      name.font = Font.mediumSystemFont(10);
      name.textColor = new Color("#ffffff", 0.5);
      name.lineLimit = 1;

      row.addSpacer();

      const amt = row.addText(formatAmount(n.amount) + " ₸");
      amt.font = Font.boldSystemFont(11);
      amt.textColor = new Color(n.color);

      if (i < showCount - 1) w.addSpacer(2);
    }

    if (family === "large") {
      w.addSpacer(6);
      // Контент сегодня
      const contentRow = w.addStack();
      contentRow.centerAlignContent();
      const contentLabel = contentRow.addText("Контент: ");
      contentLabel.font = Font.mediumSystemFont(10);
      contentLabel.textColor = new Color("#ffffff", 0.4);

      const dots = data.content;
      let dotStr = "";
      for (let i = 0; i < dots.total; i++) {
        dotStr += i < dots.done ? "●" : "○";
      }
      const dotText = contentRow.addText(dotStr + " " + dots.done + "/" + dots.total);
      dotText.font = Font.mediumSystemFont(10);
      dotText.textColor = new Color("#10b981");
    }

    w.addSpacer();

    const goalPct = ((data.goal.current / data.goal.target) * 100).toFixed(1);
    const goalText = w.addText("Цель: " + formatAmount(data.goal.current) + " / " + formatAmount(data.goal.target) + " ₸  (" + goalPct + "%)");
    goalText.font = Font.mediumSystemFont(8);
    goalText.textColor = new Color("#ffffff", 0.3);
  }

  return w;
}

// При нажатии на виджет — открывает дашборд
const data = await loadData();
const widget = await createWidget(data);
widget.url = "https://tooyakov-art.github.io/monopolie/";

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();
