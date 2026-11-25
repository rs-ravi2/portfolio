// Renders public/og.png (1200×630) from the site's own fonts and palette.
// Run: node scripts/og-image.mjs   (needs Playwright + Chromium installed; e.g. NODE_PATH=$(npm root -g))
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Playwright is not a project dependency; resolve a local/global install (NODE_PATH works here).
const { chromium } = createRequire(import.meta.url)("playwright");

const font = (p) => readFileSync(fileURLToPath(new URL(`../node_modules/${p}`, import.meta.url))).toString("base64");
const serif600 = font("@fontsource/newsreader/files/newsreader-latin-600-normal.woff2");
const mono = font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2");

const html = `<!doctype html><html><head><style>
@font-face{font-family:S;src:url(data:font/woff2;base64,${serif600}) format("woff2");font-weight:600}
@font-face{font-family:M;src:url(data:font/woff2;base64,${mono}) format("woff2")}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#f6f3ec;color:#1a1916;font-family:S;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;border-top:14px solid #1747d1}
.k{font-family:M;font-size:26px;color:#3f3b35}
h1{font-size:68px;line-height:1.05;letter-spacing:-1.2px;max-width:960px}
.row{display:flex;gap:40px;font-family:M;font-size:24px;border-top:2px solid #1a1916;padding-top:22px}
.row b{color:#1747d1;font-weight:400}
</style></head><body>
<p class="k">Ravi Singh · AI/ML Engineer · India, remote</p>
<h1>Python automation, reliable data pipelines, and AI workflows you can test.</h1>
<div class="row"><span><b>Live:</b> retrieval lab</span><span>Recall@k · MRR@k</span><span>Fixed-scope work</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: fileURLToPath(new URL("../public/og.png", import.meta.url)) });
await browser.close();
console.log("wrote public/og.png");
