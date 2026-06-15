import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DAILY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})-crypto-ai-invest-daily\.html$/;

function formatDateLabel(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(entry) {
  const text = stripHtml(entry.summary || entry.headline || entry.title);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function enhanceDailyHtml(html, entry, latestEntry) {
  if (html.includes('class="daily-nav"')) {
    return html;
  }

  const navCss = `
  <style>
    .daily-nav {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 18px;
      background: rgba(7, 12, 24, 0.92);
      border-bottom: 1px solid rgba(148, 163, 184, 0.22);
      color: #e8edf7;
      backdrop-filter: blur(14px);
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    .daily-nav a {
      color: #22d3ee;
      text-decoration: none;
      font-weight: 800;
    }
    .daily-nav span {
      color: #94a3b8;
      font-size: 13px;
    }
    @media (max-width: 720px) {
      .daily-nav {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>`;

  const navHtml = `
  <nav class="daily-nav" aria-label="日报导航">
    <a href="../">返回列表</a>
    <span>${escapeHtml(entry.date)} · ${escapeHtml(entry.title)}</span>
    <a href="./${latestEntry.date}.html">最新日报</a>
  </nav>`;

  const withCss = html.includes("</head>")
    ? html.replace("</head>", `${navCss}\n</head>`)
    : `${navCss}\n${html}`;

  return withCss.includes("<body>")
    ? withCss.replace("<body>", `<body>\n${navHtml}`)
    : `${navHtml}\n${withCss}`;
}

async function readEntry(outputsDir, filename) {
  const fullPath = path.join(outputsDir, filename);
  const html = await readFile(fullPath, "utf8");
  const match = filename.match(DAILY_FILE_PATTERN);
  if (!match) {
    return null;
  }

  const [, date] = match;
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const h1Match = html.match(/<h1>(.*?)<\/h1>/i);
  const summaryMatch = html.match(/<p class="sub">\s*([\s\S]*?)\s*<\/p>/i);

  return {
    date,
    sourcePath: fullPath,
    fileName: filename,
    href: `./daily/${date}.html`,
    title: titleMatch?.[1]?.trim() || h1Match?.[1]?.trim() || `日报 ${date}`,
    headline: h1Match?.[1]?.trim() || `日报 ${date}`,
    summary: (summaryMatch?.[1] || "").replace(/\s+/g, " ").trim(),
  };
}

function buildIndexHtml(entries) {
  const latest = entries[0];
  const latestCards = entries.slice(0, 3);
  const hotItems = latestCards
    .map(
      (entry, index) => `
          <a class="hot-row" href="${entry.href}">
            <span class="hot-rank rank-${index + 1}">${index + 1}</span>
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${index === 0 ? "最新一期" : `${entries.length - index} 个信号`} · ${index === 0 ? "刚更新" : "历史归档"}</span>
          </a>`
    )
    .join("");

  const timeline = entries
    .map(
      (entry, index) => `
        <article class="timeline-row" data-search="${escapeHtml(`${entry.title} ${entry.summary} ${entry.date}`).toLowerCase()}">
          <div class="time-block">
            <time>${index === 0 ? "22:20" : "21:00"}</time>
            <span></span>
          </div>
          <a class="feed-card" href="${entry.href}">
            <div class="feed-head">
              <div>
                <p class="source">Daily · 投资日报</p>
                <h3>${escapeHtml(entry.title)}</h3>
              </div>
              <div class="badges">
                <span class="pick">精选</span>
                <span class="score">${index === 0 ? "92" : "85"}</span>
              </div>
            </div>
            <p class="feed-summary">${escapeHtml(buildExcerpt(entry) || "打开查看当日完整投资日报。")}</p>
            <div class="tags">
              <span>加密法案</span>
              <span>加密突破</span>
              <span>稳定币支付</span>
              <span>AI 基建</span>
              <span>Circle</span>
            </div>
            <div class="reason">
              <strong>投资理由：</strong>
              <span>${index === 0 ? "最新一期聚合政策、支付、硬件与 AI 突破信号，适合先扫催化再读全文。" : "历史日报保留当日判断，可用于回看政策节奏和赛道预期变化。"}</span>
            </div>
          </a>
        </article>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily</title>
  <style>
    :root {
      --bg: #070c18;
      --side: #0a1020;
      --panel: #151b2c;
      --panel-2: #111827;
      --line: rgba(148, 163, 184, 0.16);
      --line-strong: rgba(148, 163, 184, 0.28);
      --text: #e8edf7;
      --muted: #7f8ca3;
      --cyan: #22d3ee;
      --cyan-soft: rgba(34, 211, 238, 0.12);
      --green: #20c997;
      --gold: #f6c453;
      --pink: #fb7185;
      --shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: var(--text);
      background: linear-gradient(90deg, #06101d 0, #09101f 240px, var(--bg) 240px);
    }
    a { color: inherit; text-decoration: none; }
    button, input { font: inherit; }
    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
    }
    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 24px 14px;
      border-right: 1px solid var(--line);
      background: rgba(6, 13, 28, 0.9);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 92px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(34,211,238,0.08));
      font-weight: 900;
      letter-spacing: 0.18em;
      font-size: 28px;
    }
    .logo span { color: var(--cyan); }
    .nav {
      margin-top: 18px;
      display: grid;
      gap: 8px;
    }
    .nav a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 52px;
      padding: 0 18px;
      border-radius: 18px;
      color: var(--muted);
      font-weight: 700;
    }
    .nav a.active {
      color: var(--cyan);
      background: rgba(34,211,238,0.12);
      border: 1px solid rgba(34,211,238,0.28);
    }
    .nav-mark {
      width: 18px;
      height: 18px;
      border-radius: 6px;
      border: 2px solid currentColor;
      display: inline-block;
    }
    .sidebar-foot {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 24px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 18px;
      display: flex;
      justify-content: space-around;
      color: var(--muted);
    }
    .content {
      width: min(100%, 1840px);
      padding: 32px 36px 70px;
    }
    .hero {
      border: 1px solid var(--line);
      border-radius: 18px;
      background:
        linear-gradient(120deg, rgba(34, 211, 238, 0.12), transparent 28%),
        linear-gradient(135deg, #151b2c 0%, #171d30 58%, #1d2438 100%);
      box-shadow: var(--shadow);
      padding: 26px 28px 22px;
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: 34px;
      letter-spacing: 0;
    }
    .hero-sub {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
    }
    .hero-line {
      margin: 18px 0 14px;
      border-top: 1px solid var(--line);
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: space-between;
    }
    .tabs {
      display: grid;
      grid-template-columns: repeat(6, minmax(74px, 1fr));
      width: min(640px, 100%);
      padding: 4px;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      background: rgba(255,255,255,0.04);
    }
    .tab {
      border: 0;
      border-radius: 999px;
      color: var(--muted);
      background: transparent;
      padding: 9px 10px;
      cursor: pointer;
      font-weight: 700;
    }
    .tab.active {
      color: var(--cyan);
      background: rgba(34,211,238,0.14);
      box-shadow: inset 0 0 0 1px rgba(34,211,238,0.35);
    }
    .search {
      display: flex;
      gap: 10px;
      min-width: 330px;
    }
    .search input {
      width: 100%;
      border: 1px solid var(--line-strong);
      border-radius: 16px;
      background: rgba(255,255,255,0.04);
      color: var(--text);
      padding: 0 16px;
      outline: none;
    }
    .search button {
      min-width: 96px;
      border: 1px solid rgba(34,211,238,0.45);
      color: var(--cyan);
      background: rgba(34,211,238,0.12);
      border-radius: 999px;
      font-weight: 800;
      cursor: pointer;
    }
    .hot-panel {
      margin-top: 20px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(21,27,44,0.96), rgba(17,24,39,0.96));
      box-shadow: var(--shadow);
      padding: 24px 28px;
    }
    .panel-head {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: start;
    }
    .panel-title {
      margin: 0;
      font-size: 23px;
    }
    .panel-note {
      color: var(--muted);
      text-align: right;
      line-height: 1.9;
    }
    .hot-list {
      margin-top: 18px;
      display: grid;
      gap: 15px;
    }
    .hot-row {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      font-size: 18px;
    }
    .hot-row span:last-child {
      color: var(--muted);
      font-size: 14px;
    }
    .hot-rank {
      font-weight: 900;
      color: var(--cyan);
    }
    .rank-1 { color: var(--pink); }
    .rank-2 { color: var(--gold); }
    .timeline-section {
      margin-top: 34px;
    }
    .date-label {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 0 0 12px 34px;
      color: var(--muted);
      font-size: 22px;
      font-weight: 800;
    }
    .timeline {
      display: grid;
      gap: 16px;
    }
    .timeline-row {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
    }
    .time-block {
      position: relative;
      display: flex;
      justify-content: flex-end;
      padding-right: 26px;
      color: var(--text);
      font-size: 25px;
      font-weight: 900;
    }
    .time-block:after {
      content: "";
      position: absolute;
      right: 6px;
      top: 0;
      bottom: -18px;
      width: 1px;
      background: var(--line-strong);
    }
    .time-block span {
      position: absolute;
      right: 0;
      top: 12px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 4px rgba(32, 201, 151, 0.12);
      z-index: 1;
    }
    .feed-card {
      display: block;
      min-height: 210px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(23, 30, 48, 0.98), rgba(18, 25, 40, 0.98));
      padding: 24px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.18);
      transition: border-color 160ms ease, transform 160ms ease;
    }
    .feed-card:hover {
      border-color: rgba(34, 211, 238, 0.35);
      transform: translateY(-1px);
    }
    .feed-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
    }
    .source {
      margin: 0 0 12px;
      color: var(--muted);
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .feed-card h3 {
      margin: 0;
      font-size: 22px;
      line-height: 1.35;
    }
    .badges {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .pick, .score {
      border-radius: 999px;
      padding: 4px 10px;
      font-weight: 900;
      font-size: 13px;
    }
    .pick {
      color: var(--gold);
      border: 1px solid rgba(246,196,83,0.35);
      background: rgba(246,196,83,0.1);
    }
    .score {
      color: var(--cyan);
      border: 1px solid rgba(34,211,238,0.32);
      background: rgba(34,211,238,0.1);
    }
    .feed-summary {
      margin: 16px 0 0;
      color: #9aa8bd;
      line-height: 1.75;
      font-size: 16px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .tags span {
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(148,163,184,0.14);
      color: #aab6c8;
      font-size: 13px;
    }
    .reason {
      margin-top: 20px;
      border-radius: 10px;
      background: rgba(32, 201, 151, 0.1);
      color: var(--green);
      padding: 12px 14px;
      line-height: 1.6;
      font-weight: 700;
    }
    .empty {
      display: none;
      margin: 22px 0 0 150px;
      color: var(--muted);
    }
    @media (max-width: 1100px) {
      body { background: var(--bg); }
      .shell { grid-template-columns: 1fr; }
      .sidebar {
        position: static;
        height: auto;
        padding: 12px;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
      }
      .logo { width: 150px; height: 58px; font-size: 22px; }
      .nav {
        margin-top: 0;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        align-content: center;
      }
      .nav a { min-height: 44px; justify-content: center; padding: 0 10px; }
      .nav a:nth-last-child(-n+3), .sidebar-foot { display: none; }
      .content { padding: 18px 14px 48px; }
      .toolbar, .panel-head {
        grid-template-columns: 1fr;
        display: grid;
      }
      .search { min-width: 0; }
      .panel-note { text-align: left; }
    }
    @media (max-width: 720px) {
      .sidebar { grid-template-columns: 1fr; }
      .logo { width: 100%; }
      .nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hero, .hot-panel, .feed-card {
        padding: 18px;
      }
      .tabs {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-radius: 18px;
      }
      .hot-row {
        grid-template-columns: 24px 1fr;
      }
      .hot-row span:last-child {
        grid-column: 2;
      }
      .timeline-row {
        grid-template-columns: 70px minmax(0, 1fr);
        gap: 12px;
      }
      .time-block {
        font-size: 18px;
        padding-right: 18px;
      }
      .feed-head {
        grid-template-columns: 1fr;
      }
      .feed-card h3 { font-size: 18px; }
      .feed-summary { font-size: 14px; }
      .empty { margin-left: 0; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <a class="logo" href="./">DAI<span>LY</span></a>
      <nav class="nav" aria-label="主导航">
        <a class="active" href="./"><span class="nav-mark"></span>精选</a>
        <a href="./data/dailies.json"><span class="nav-mark"></span>全部动态</a>
        <a href="${latest.href}"><span class="nav-mark"></span>AI 日报</a>
        <a href="${latest.href}#circle"><span class="nav-mark"></span>Circle</a>
        <a href="${latest.href}#hardware"><span class="nav-mark"></span>AI 基建</a>
        <a href="${latest.href}#watchlist"><span class="nav-mark"></span>跟踪清单</a>
      </nav>
      <div class="sidebar-foot">
        <span>夜间</span>
        <span>22:20</span>
        <span>Vercel</span>
      </div>
    </aside>
    <main class="content">
      <section class="hero">
        <h1>精选</h1>
        <p class="hero-sub">AI 自动挑选的高价值投资内容。覆盖加密法案、加密重大突破、稳定币支付、Circle、AI 基建与重大突破。</p>
        <div class="hero-line"></div>
        <div class="toolbar">
          <div class="tabs" role="tablist" aria-label="内容分类">
            <button class="tab active" type="button" data-filter="all">全部</button>
            <button class="tab" type="button" data-filter="法案">法案</button>
            <button class="tab" type="button" data-filter="支付">支付</button>
            <button class="tab" type="button" data-filter="Circle">Circle</button>
            <button class="tab" type="button" data-filter="基建">基建</button>
            <button class="tab" type="button" data-filter="突破">突破</button>
          </div>
          <form class="search" id="searchForm">
            <input id="searchInput" type="search" placeholder="搜索标题/摘要..." aria-label="搜索标题或摘要" />
            <button type="submit">搜索</button>
          </form>
        </div>
      </section>

      <section class="hot-panel" aria-labelledby="hot-title">
        <div class="panel-head">
          <h2 class="panel-title" id="hot-title">当前热点</h2>
          <div class="panel-note">多信源热度 · 随日报更新<br />${entries.length} 期归档 · 最新 ${formatDateLabel(latest.date)}</div>
        </div>
        <div class="hot-list">
          ${hotItems}
        </div>
      </section>

      <section class="timeline-section" aria-labelledby="timeline-title">
        <h2 class="date-label" id="timeline-title">${formatDateLabel(latest.date)}</h2>
        <div class="timeline">
          ${timeline}
        </div>
        <p class="empty" id="emptyState">没有匹配结果，换个关键词。</p>
      </section>
    </main>
  </div>
  <script>
    const input = document.querySelector("#searchInput");
    const form = document.querySelector("#searchForm");
    const tabs = Array.from(document.querySelectorAll(".tab"));
    const rows = Array.from(document.querySelectorAll(".timeline-row"));
    const empty = document.querySelector("#emptyState");
    let activeFilter = "all";

    function applyFilters() {
      const query = input.value.trim().toLowerCase();
      let visible = 0;
      for (const row of rows) {
        const haystack = row.dataset.search || "";
        const matchesQuery = !query || haystack.includes(query);
        const matchesFilter = activeFilter === "all" || haystack.includes(activeFilter.toLowerCase());
        const show = matchesQuery && matchesFilter;
        row.style.display = show ? "" : "none";
        if (show) visible += 1;
      }
      empty.style.display = visible ? "none" : "block";
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });
    input.addEventListener("input", applyFilters);
    for (const tab of tabs) {
      tab.addEventListener("click", () => {
        activeFilter = tab.dataset.filter;
        tabs.forEach((item) => item.classList.toggle("active", item === tab));
        applyFilters();
      });
    }
  </script>
</body>
</html>`;
}

export async function buildSite({ outputsDir, siteDir }) {
  const fileNames = await readdir(outputsDir);
  const entries = (
    await Promise.all(fileNames.map((fileName) => readEntry(outputsDir, fileName)))
  )
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    throw new Error(`No daily html files found in ${outputsDir}`);
  }

  await mkdir(path.join(siteDir, "daily"), { recursive: true });
  await mkdir(path.join(siteDir, "data"), { recursive: true });

  for (const entry of entries) {
    const html = await readFile(entry.sourcePath, "utf8");
    await writeFile(
      path.join(siteDir, "daily", `${entry.date}.html`),
      enhanceDailyHtml(html, entry, entries[0]),
      "utf8"
    );
  }

  const manifest = entries.map(({ date, href, title, summary }) => ({
    date,
    href,
    title,
    summary,
  }));

  await writeFile(path.join(siteDir, "data", "dailies.json"), JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(path.join(siteDir, "index.html"), buildIndexHtml(entries), "utf8");

  return manifest;
}
