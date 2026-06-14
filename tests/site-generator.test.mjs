import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildSite } from "../src/site-generator.mjs";

test("buildSite creates index, manifest, and copied daily pages ordered newest first", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "daily-site-"));
  const outputsDir = path.join(root, "outputs");
  const siteDir = path.join(root, "site");

  await mkdir(outputsDir, { recursive: true });
  await writeFile(
    path.join(outputsDir, "2026-06-13-crypto-ai-invest-daily.html"),
    "<!DOCTYPE html><html><head><title>Day 1</title></head><body><h1>Day 1</h1></body></html>",
    "utf8"
  );
  await writeFile(
    path.join(outputsDir, "2026-06-14-crypto-ai-invest-daily.html"),
    "<!DOCTYPE html><html><head><title>Day 2</title></head><body><h1>Day 2</h1></body></html>",
    "utf8"
  );

  await buildSite({ outputsDir, siteDir });

  const manifest = JSON.parse(await readFile(path.join(siteDir, "data", "dailies.json"), "utf8"));
  assert.equal(manifest.length, 2);
  assert.equal(manifest[0].date, "2026-06-14");
  assert.equal(manifest[0].href, "./daily/2026-06-14.html");
  assert.equal(manifest[1].date, "2026-06-13");

  const indexHtml = await readFile(path.join(siteDir, "index.html"), "utf8");
  assert.match(indexHtml, /最新一期/);
  assert.match(indexHtml, /2026-06-14/);
  assert.match(indexHtml, /2026-06-13/);
  assert.match(indexHtml, /Daily/);
  assert.match(indexHtml, /class="shell"/);
  assert.match(indexHtml, /class="sidebar"/);
  assert.match(indexHtml, /当前热点/);
  assert.match(indexHtml, /class="timeline"/);
  assert.match(indexHtml, /投资理由/);

  await stat(path.join(siteDir, "daily", "2026-06-13.html"));
  await stat(path.join(siteDir, "daily", "2026-06-14.html"));
});
