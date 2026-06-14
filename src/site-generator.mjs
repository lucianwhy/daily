import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DAILY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})-crypto-ai-invest-daily\.html$/;

function formatDateLabel(date) {
  return date.replaceAll("-", ".");
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
  const history = entries
    .map(
      (entry) => `
        <a class="history-item" href="${entry.href}">
          <div>
            <div class="history-date">${formatDateLabel(entry.date)}</div>
            <div class="history-title">${entry.title}</div>
          </div>
          <span class="history-link">查看</span>
        </a>`
    )
    .join("");

  const latestGrid = latestCards
    .map(
      (entry, index) => `
        <a class="mini-card" href="${entry.href}">
          <span class="mini-eyebrow">${index === 0 ? "Latest" : "Archive"}</span>
          <h3>${entry.date}</h3>
          <p>${entry.summary || "打开查看当日投资日报。"} </p>
        </a>`
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
      --bg: #f3f5f7;
      --panel: #ffffff;
      --ink: #14202b;
      --muted: #5d6a76;
      --line: #dbe2ea;
      --brand: #0f62fe;
      --brand-soft: #ebf2ff;
      --shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(15, 98, 254, 0.08), transparent 24%),
        linear-gradient(180deg, #eef4ff 0%, var(--bg) 220px);
    }
    a { color: inherit; text-decoration: none; }
    .wrap {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 56px;
    }
    .hero {
      padding: 28px;
      border-radius: 26px;
      background: linear-gradient(135deg, #0f172a 0%, #162845 58%, #24529b 100%);
      color: #f8fbff;
      box-shadow: var(--shadow);
    }
    .eyebrow {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.12);
      font-size: 12px;
      letter-spacing: 0.04em;
    }
    h1 {
      margin: 14px 0 10px;
      font-size: clamp(30px, 4vw, 48px);
      line-height: 1.08;
    }
    .hero p {
      margin: 0;
      max-width: 860px;
      color: rgba(248, 251, 255, 0.84);
      font-size: 15px;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
      margin-top: 22px;
    }
    .featured, .mini-card {
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08);
      padding: 18px;
    }
    .featured h2, .mini-card h3 {
      margin: 0 0 8px;
    }
    .featured h2 {
      font-size: 26px;
      line-height: 1.15;
    }
    .featured small, .mini-eyebrow {
      display: inline-block;
      margin-bottom: 10px;
      color: #9fc2ff;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .featured p, .mini-card p {
      color: rgba(248, 251, 255, 0.84);
      font-size: 14px;
    }
    .mini-stack {
      display: grid;
      gap: 14px;
    }
    .main {
      display: grid;
      grid-template-columns: 1fr 0.9fr;
      gap: 18px;
      margin-top: 22px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 22px;
      box-shadow: var(--shadow);
    }
    .panel h2 {
      margin: 0 0 8px;
      font-size: 22px;
    }
    .panel p {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 14px;
    }
    .history-list {
      display: grid;
      gap: 12px;
    }
    .history-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fbfcfe;
    }
    .history-date {
      color: var(--brand);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .history-title {
      margin-top: 6px;
      font-size: 16px;
      font-weight: 600;
      color: var(--ink);
    }
    .history-link {
      flex: none;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand);
      font-size: 13px;
      font-weight: 600;
    }
    .notes {
      display: grid;
      gap: 12px;
    }
    .note {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fbfcfe;
    }
    .note h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }
    .note p {
      margin: 0;
    }
    @media (max-width: 960px) {
      .wrap { width: min(100vw - 20px, 1180px); }
      .hero-grid, .main {
        grid-template-columns: 1fr;
      }
      .hero, .panel {
        padding: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <span class="eyebrow">AI Hot 风格参考 / 投资日报静态站</span>
      <h1>Daily</h1>
      <p>每天更新一页。首页负责展示最新一期、历史归档和阅读入口。单日报页保留完整投资研究版式，适合直接部署到 GitHub + Vercel。</p>
      <div class="hero-grid">
        <a class="featured" href="${latest.href}">
          <small>最新一期</small>
          <h2>${latest.title}</h2>
          <p>${latest.summary || "打开查看今天的完整日报。"} </p>
        </a>
        <div class="mini-stack">
          ${latestGrid}
        </div>
      </div>
    </section>

    <section class="main">
      <div class="panel">
        <h2>历史日报</h2>
        <p>按日期倒序排列。后面每天更新时，只要重新生成站点，首页和历史列表会自动刷新。</p>
        <div class="history-list">
          ${history}
        </div>
      </div>
      <div class="panel">
        <h2>更新方式</h2>
        <div class="notes">
          <div class="note">
            <h3>1. 写当天日报</h3>
            <p>把当天完整 HTML 放进 <code>outputs/</code>，命名保持 <code>YYYY-MM-DD-crypto-ai-invest-daily.html</code>。</p>
          </div>
          <div class="note">
            <h3>2. 生成站点</h3>
            <p>运行一次构建脚本，自动生成首页、归档清单、日报子页和元数据。</p>
          </div>
          <div class="note">
            <h3>3. 推到 GitHub</h3>
            <p>Vercel 从 GitHub 拉取后，静态站会直接更新。也可以本地用 Vercel CLI 直接部署。</p>
          </div>
        </div>
      </div>
    </section>
  </div>
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
    await copyFile(entry.sourcePath, path.join(siteDir, "daily", `${entry.date}.html`));
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
