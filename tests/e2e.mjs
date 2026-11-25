// Browser checks against a running preview (npm run build && npm run preview).
// Run: NODE_PATH=$(npm root -g) node tests/e2e.mjs [baseUrl] [axePath] [screenshotDir]
// Set E2E_BROWSER=firefox or E2E_BROWSER=webkit (Safari's engine) to run the same checks there.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const engine = require("playwright")[process.env.E2E_BROWSER ?? "chromium"];

const BASE = process.argv[2] ?? "http://127.0.0.1:4321/";
const AXE = process.argv[3];
const SHOTS = process.argv[4];
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name, e.message.split("\n")[0]]); }
};

const browser = await engine.launch();

// 1. No horizontal scroll at common widths
for (const width of [320, 360, 390, 768, 1024, 1280, 1440]) {
  await check(`no horizontal scroll at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `overflow ${over}px`);
    await page.close();
  });
}

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(BASE);
const firstB = () => page.locator(".approach-synonyms .result").first().locator(".result-id").textContent();
const firstA = () => page.locator(".approach-keyword .result").first().locator(".result-id").textContent();

// 2. Default state = computed static result
await check("default question shows keyword miss and synonym hit D03", async () => {
  assert.equal(await page.locator(".approach-keyword .result").count(), 0);
  assert.equal(await firstB(), "D03");
});

// 3. Controls change actual computed results
await check("choosing the van question flips B to the street-trading page", async () => {
  await page.getByLabel("Can I get a permit for my van?").check();
  assert.equal(await firstA(), "D05");
  assert.equal(await firstB(), "D06");
  assert.match(await page.locator(".what-changed").textContent(), /worse/);
});
await check("switching off permit → licence restores D05 and changes MRR", async () => {
  const before = await page.locator(".metric").nth(1).locator("dd").nth(1).textContent();
  await page.locator('input[name="rule"][value="permit"]').uncheck();
  assert.equal(await firstB(), "D05");
  const after = await page.locator(".metric").nth(1).locator("dd").nth(1).textContent();
  assert.notEqual(before, after);
  await page.locator('input[name="rule"][value="permit"]').check();
});
await check("k = 1 limits each column to one result and relabels metrics", async () => {
  await page.getByLabel("Which day do they empty my bin?").check();
  await page.locator('input[name="k"][value="1"]').check();
  assert.ok((await page.locator(".approach-keyword .result").count()) <= 1);
  assert.match(await page.locator(".metric-name").first().textContent(), /Recall@1/);
  await page.locator('input[name="k"][value="5"]').check();
  assert.ok((await page.locator(".flag-tie").count()) > 0, "expected visible tie flag at k=5 for bin");
});
await check("one polite announcement after a change", async () => {
  await page.waitForTimeout(450);
  const t = await page.locator("#lab-status").textContent();
  assert.match(t, /^Results updated\./);
  assert.equal(await page.locator("[aria-live]").count(), 1);
});

// 4. Keyboard
await check("keyboard: skip link first, radios operable with arrows, focus visible", async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE);
  // Safari's Tab skips links and radios by default; Option+Tab is its "every item" key.
  const TAB = process.env.E2E_BROWSER === "webkit" ? "Alt+Tab" : "Tab";
  await p.keyboard.press(TAB);
  assert.equal(await p.evaluate(() => document.activeElement.textContent.trim()), "Skip to content");
  // Tab to first question radio
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press(TAB);
    if (await p.evaluate(() => document.activeElement?.name === "question")) break;
  }
  assert.equal(await p.evaluate(() => document.activeElement.name), "question");
  const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, "none");
  await p.keyboard.press("ArrowDown");
  assert.equal(await p.evaluate(() => document.activeElement.value), "bin");
  assert.equal(await p.locator(".approach-synonyms .result").first().locator(".result-id").textContent(), "D01");
  await p.close();
});

// 5. Without JavaScript
await check("without JS: default result readable, controls hidden, table complete", async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE);
  assert.ok(await p.locator(".approach-synonyms .result").first().isVisible());
  assert.ok(!(await p.locator("#lab-controls").isVisible()));
  assert.equal(await p.locator(".per-question tbody tr").count(), 10);
  assert.ok(await p.locator("noscript").count());
  await ctx.close();
});

// 6. Reduced motion
await check("reduced motion: no update animation, no smooth scroll", async () => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.getByLabel("Which day do they empty my bin?").check();
  const anim = await p.evaluate(() => getComputedStyle(document.querySelector(".comparison")).animationName);
  assert.equal(anim, "none");
  assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), "auto");
  await ctx.close();
});

// 7. Links and actions all resolve
await check("every in-page link has a target; no empty hrefs", async () => {
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  for (const h of hrefs) {
    assert.ok(h && h !== "#", `bad href ${h}`);
    if (h.startsWith("#")) assert.ok(await page.locator(h).count(), `missing target ${h}`);
  }
});

// 8. axe
if (AXE) {
  for (const [label, opts] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    await check(`axe (WCAG 2.2 AA incl. contrast) ${label}`, async () => {
      const p = await browser.newPage({ viewport: opts });
      await p.goto(BASE);
      await p.addScriptTag({ path: AXE });
      const r = await p.evaluate(async () =>
        // eslint-disable-next-line no-undef
        axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }),
      );
      const v = r.violations.map((x) => `${x.id}(${x.nodes.length})`);
      assert.deepEqual(v, [], v.join(", "));
      await p.close();
    });
  }
}

if (SHOTS) {
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await d.goto(BASE);
  await d.screenshot({ path: `${SHOTS}/desktop-full.png`, fullPage: true });
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await m.goto(BASE);
  await m.screenshot({ path: `${SHOTS}/mobile-full.png`, fullPage: true });
}

await browser.close();
for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
