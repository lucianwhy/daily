# Daily

静态投资日报站。首页展示最新一期和历史归档，单日报页来自 `outputs/` 里的完整 HTML。

## 目录

- `outputs/`: 每天生成的原始日报 HTML
- `src/site-generator.mjs`: 站点生成逻辑
- `scripts/generate-site.mjs`: 一键生成首页、归档、日报子页
- `site/`: 生成后的静态站点目录

## 本地生成

```bash
npm run build
```

生成完成后：

- 首页：`site/index.html`
- 日报页：`site/daily/YYYY-MM-DD.html`
- 元数据：`site/data/dailies.json`

## 本地预览

```bash
cd site
python -m http.server 4173
```

打开：

- `http://127.0.0.1:4173/`

## 每天更新

1. 把当天日报放进 `outputs/`
2. 文件名保持：

```text
YYYY-MM-DD-crypto-ai-invest-daily.html
```

3. 运行：

```bash
npm run build
```

首页和历史列表会自动更新。

## GitHub

初始化仓库后推上去：

```bash
git init
git add .
git commit -m "init daily site"
```

如果本机已登录 GitHub CLI，可继续：

```bash
gh repo create daily --public --source . --remote origin --push
```

## Vercel CLI

首次部署：

```bash
vercel
```

生产部署：

```bash
vercel --prod
```

推荐在 Vercel 项目里设置：

- Build Command: `npm run build`
- Output Directory: `site`

这样以后 GitHub 有新提交，Vercel 会自动更新。
