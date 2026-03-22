// Монополие Widget для Scriptable (iOS)
// 1. Скачай Scriptable из App Store
// 2. Создай новый скрипт, вставь этот код
// 3. Долгое нажатие на домашнем экране → Виджеты → Scriptable → выбери этот скрипт

const DATA = {
  total: "2.95M ₸",
  totalSub: "≈ $6,020",
  change: "+23.4%",
  today: "98K ₸",
  todayChange: "+12%",
  niches: [
    { icon: "📱", name: "AI Apps", amount: "810K", color: "#10b981" },
    { icon: "🌐", name: "AI Sites", amount: "540K", color: "#a855f7" },
    { icon: "🤖", name: "AI Bots", amount: "414K", color: "#06b6d4" },
    { icon: "⚡", name: "VibeCoder", amount: "381K", color: "#00d4ff" },
    { icon: "📝", name: "AI Content", amount: "342K", color: "#f59e0b" },
    { icon: "🎨", name: "AI Design", amount: "288K", color: "#ec4899" },
    { icon: "🚀", name: "AI SaaS", amount: "171K", color: "#ef4444" },
  ],
  goal: { current: 2.95, target: 45, percent: 6.55 }
};

// Когда подключишь реальные данные — замени DATA на fetch:
// const req = new Request("https://your-api.com/stats");
// const DATA = await req.loadJSON();

async function createWidget() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0a0a0f");
  w.setPadding(12, 14, 12, 14);

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
  const live = header.addText("● Live");
  live.font = Font.mediumSystemFont(9);
  live.textColor = new Color("#10b981");

  w.addSpacer(8);

  // Семейство виджета определяет layout
  const family = config.widgetFamily || "medium";

  if (family === "small") {
    // --- SMALL: только доход ---
    const label = w.addText("Доход за март");
    label.font = Font.mediumSystemFont(9);
    label.textColor = new Color("#ffffff", 0.4);

    w.addSpacer(2);
    const amount = w.addText(DATA.total);
    amount.font = Font.heavySystemFont(24);
    amount.textColor = new Color("#00d4ff");

    const sub = w.addText(DATA.totalSub);
    sub.font = Font.mediumSystemFont(10);
    sub.textColor = new Color("#ffffff", 0.4);

    w.addSpacer(4);

    const changeRow = w.addStack();
    const ch = changeRow.addText(DATA.change);
    ch.font = Font.boldSystemFont(12);
    ch.textColor = new Color("#10b981");
    changeRow.addSpacer();
    const td = changeRow.addText("Сегодня: " + DATA.today);
    td.font = Font.mediumSystemFont(10);
    td.textColor = new Color("#ffffff", 0.5);

    w.addSpacer();
    // Goal bar
    const goalStack = w.addStack();
    goalStack.size = new Size(0, 4);
    goalStack.cornerRadius = 2;
    goalStack.backgroundColor = new Color("#ffffff", 0.06);
    // Scriptable doesn't support partial fills easily, show text instead
    const goalText = w.addText(`${DATA.goal.current}M / ${DATA.goal.target}M ₸  (${DATA.goal.percent}%)`);
    goalText.font = Font.mediumSystemFont(8);
    goalText.textColor = new Color("#ffffff", 0.3);

  } else {
    // --- MEDIUM / LARGE: доход + ниши ---
    const topRow = w.addStack();

    // Left: total
    const leftCol = topRow.addStack();
    leftCol.layoutVertically();

    const label = leftCol.addText("Доход за март");
    label.font = Font.mediumSystemFont(9);
    label.textColor = new Color("#ffffff", 0.4);
    leftCol.addSpacer(1);

    const amount = leftCol.addText(DATA.total);
    amount.font = Font.heavySystemFont(22);
    amount.textColor = new Color("#00d4ff");

    const sub = leftCol.addText(DATA.totalSub + "  " + DATA.change);
    sub.font = Font.mediumSystemFont(9);
    sub.textColor = new Color("#10b981");

    topRow.addSpacer();

    // Right: today
    const rightCol = topRow.addStack();
    rightCol.layoutVertically();

    const tdLabel = rightCol.addText("Сегодня");
    tdLabel.font = Font.mediumSystemFont(9);
    tdLabel.textColor = new Color("#ffffff", 0.4);
    rightCol.addSpacer(1);

    const tdVal = rightCol.addText(DATA.today);
    tdVal.font = Font.heavySystemFont(18);
    tdVal.textColor = Color.white();

    const tdSub = rightCol.addText(DATA.todayChange + " vs вчера");
    tdSub.font = Font.mediumSystemFont(9);
    tdSub.textColor = new Color("#10b981");

    w.addSpacer(8);

    // Niches (top 4 for medium, all for large)
    const showCount = family === "large" ? DATA.niches.length : 4;

    for (let i = 0; i < showCount; i++) {
      const n = DATA.niches[i];
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

      const amt = row.addText(n.amount + " ₸");
      amt.font = Font.boldSystemFont(11);
      amt.textColor = new Color(n.color);

      if (i < showCount - 1) w.addSpacer(2);
    }

    w.addSpacer();

    // Goal
    const goalText = w.addText(`Цель: ${DATA.goal.current}M / ${DATA.goal.target}M ₸  (${DATA.goal.percent}%)`);
    goalText.font = Font.mediumSystemFont(8);
    goalText.textColor = new Color("#ffffff", 0.3);
  }

  return w;
}

const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Превью при запуске в приложении
  await widget.presentMedium();
}

Script.complete();
