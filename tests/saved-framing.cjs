const assert = require("node:assert/strict");
const path = require("node:path");
const {chromium} = require("playwright");
const base = process.env.BADGE_PROOF_TEST_URL;
const ready = page => page.locator("main:not([inert])").waitFor({timeout: 60000});
async function place(page, index) {
  await page.locator(".slot").nth(index).click();
  await page.locator('.asset[title="high-resolution.png"]').click();
}
async function expectCrop(page, zoom, x, y) {
  assert.equal(Number(await page.locator("#zoom-number").inputValue()), zoom, "reused zoom");
  assert.equal(Number(await page.locator("#x-number").inputValue()), x, "reused horizontal framing");
  assert.equal(Number(await page.locator("#y-number").inputValue()), y, "reused vertical framing");
}
(async () => {
  // The runner starts a dedicated temporary library, never the live library.
  const records = await (await fetch(base + "/api/library")).json();
  for (const record of records.filter(r => r.name === "high-resolution.png")) {
    await fetch(base + "/api/library/" + record.id, {method: "DELETE", headers: {Origin: base}});
  }
  const browser = await chromium.launch({channel: process.env.BADGE_PROOF_BROWSER || undefined, headless: true});
  try {
    let context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    let page = await context.newPage();
    await page.goto(base); await ready(page);
    await page.locator("#files").setInputFiles(path.join(__dirname, "fixtures/high-resolution.png"));
    await ready(page);
    await page.locator("#zoom-number").fill("141");
    await page.locator("#x-number").fill("3.5");
    await page.locator("#y-number").fill("-4");
    await page.locator("#edit-design").click(); await ready(page);
    if (await page.locator("#editor-save-framing").count()) {
      await page.locator("#editor-save-framing").click(); await ready(page);
      assert.match(await page.locator("#editor-framing-help").innerText(), /58/);
      await page.screenshot({path: path.join(process.env.BADGE_PROOF_TEST_ARTIFACTS, "saved-framing.png")});
    } else await page.locator("#editor-apply-all").click();
    await page.locator("#close-editor").click();
    await place(page, 1);
    await expectCrop(page, 141, 3.5, -4);
    const [record] = (await (await fetch(base + "/api/library")).json()).filter(r => r.name === "high-resolution.png");
    assert.deepEqual(record.framings["58"], {zoom: 1.41, x: 3.5, y: -4});
    await context.close();

    // A different browser context has no layout preferences: reuse must come from disk.
    context = await browser.newContext(); page = await context.newPage();
    await page.goto(base); await ready(page);
    await place(page, 0); await expectCrop(page, 141, 3.5, -4);
    assert.equal(await page.locator('.asset[title="high-resolution.png"] .saved-framing-preview img').evaluate(node => node.style.width), "141%");
    await page.locator("#preset").selectOption("25");
    await place(page, 0); await expectCrop(page, 100, 0, 0);
    await page.locator("#zoom-number").fill("75");
    await page.locator("#edit-design").click(); await ready(page);
    await page.locator("#editor-save-framing").click(); await ready(page);
    await page.locator("#close-editor").click();
    await page.locator("#preset").selectOption("58");
    await place(page, 2); await expectCrop(page, 141, 3.5, -4);
    // A one-off change must not override the library default in a newly composed batch.
    await page.locator("#zoom-number").fill("125");
    await page.locator("[data-quantity]").first().fill("5");
    await page.locator("#build-batch").click();
    for (let i = 0; i < 5; i++) {
      await page.locator(".slot").nth(i).click(); await expectCrop(page, 141, 3.5, -4);
    }
    const response = await fetch(base + "/api/library/" + record.id, {method: "PATCH",
      headers: {Origin: base, "Content-Type": "application/json"},
      body: JSON.stringify({framing: {size: "58", zoom: -1, x: 0, y: 0}})});
    assert.equal(response.status, 400, "invalid framing rejected");
    const saved = (await (await fetch(base + "/api/library")).json()).find(r => r.id === record.id);
    assert.deepEqual(saved.framings["58"], {zoom: 1.41, x: 3.5, y: -4});
    assert.deepEqual(saved.framings["25"], {zoom: .75, x: 0, y: 0});
    const crypto = require("node:crypto");
    const fs = require("node:fs");
    const original = fs.readFileSync(path.join(__dirname, "fixtures/high-resolution.png"));
    const source = Buffer.from(await (await fetch(base + "/api/library/" + record.id + "/source")).arrayBuffer());
    assert.equal(crypto.createHash("sha256").update(source).digest("hex"), crypto.createHash("sha256").update(original).digest("hex"), "original pixels preserved");
    console.log("PASS: framing reused for new copies, saved across fresh browsers, separate per badge size, reflected in thumbnails, used by batch quantities; invalid framing rejected.");
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
