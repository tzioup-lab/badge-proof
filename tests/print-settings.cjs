const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");
const {PDFDocument} = require("../vendor/pdf-lib.min.js");

(async () => {
  const browser = await chromium.launch({channel: process.env.BADGE_PROOF_BROWSER || undefined, headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    await page.addInitScript(() => {window.printCalls = 0; window.print = () => window.printCalls++;});
    await page.goto(process.env.BADGE_PROOF_TEST_URL);
    await page.locator("main:not([inert])").waitFor();
    await page.locator("#files").setInputFiles(path.join(__dirname, "fixtures/high-resolution.png"));
    await page.locator("main:not([inert])").waitFor();
    await page.locator("#print").click();
    const setup = page.locator("#print-setup");
    const hasSetup = await setup.count() > 0;
    if (hasSetup) {
      assert.equal(await page.evaluate(() => window.printCalls), 0, "settings shown before opening print dialog");
      assert.equal(await setup.evaluate(node => node.open), true);
      assert.match(await setup.innerText(), /A4/);
      assert.match(await setup.innerText(), /Letter/);
      assert.match(await setup.innerText(), /Aucune|None/);
      assert.match(await setup.innerText(), /100/);
      await page.screenshot({path: path.join(process.env.BADGE_PROOF_TEST_ARTIFACTS, "print-settings-fr.png")});
      await page.locator("#continue-print").click();
    }
    await page.waitForFunction(() => window.printCalls === 1);
    assert.equal(await page.locator(".print-page").count(), 1);
    await page.emulateMedia({media: "print"});
    const letter = await page.addStyleTag({content: "@page { size: Letter portrait; margin: 0; }"});
    const letterBytes = await page.pdf({preferCSSPageSize: true, printBackground: true});
    const letterPDF = await PDFDocument.load(letterBytes);
    console.log("Letter override:", letterPDF.getPageCount(), "pages (A4 artwork overflows shorter Letter paper)");
    assert.equal(letterPDF.getPageCount(), 2, "reproduces scale-bar overflow when A4 is printed on Letter");
    await letter.evaluate(node => node.remove());
    const a4Bytes = await page.pdf({preferCSSPageSize: true, printBackground: true});
    const a4 = await PDFDocument.load(a4Bytes);
    assert.equal(a4.getPageCount(), 1, "A4 keeps scale bar on same page");
    const size = a4.getPage(0).getSize();
    assert.ok(Math.abs(size.width * 25.4 / 72 - 210) < .2);
    assert.ok(Math.abs(size.height * 25.4 / 72 - 297) < .2);
    fs.writeFileSync(path.join(process.env.BADGE_PROOF_TEST_ARTIFACTS, "print-settings-a4.pdf"), a4Bytes);
    console.log("A4 / zero margins / 100%:", a4.getPageCount(), "page,", size);
    assert.equal(hasSetup, true, "print action must explain A4, margins None and explicit 100% before browser dialog");
    await page.emulateMedia({media: "screen"});
    await page.locator("#language").selectOption("en");
    await page.locator("#print").click();
    assert.match(await setup.innerText(), /None/);
    assert.match(await setup.innerText(), /Letter/);
    assert.match(await setup.innerText(), /100/);
    await page.setViewportSize({width: 390, height: 850});
    assert.ok(await setup.evaluate(node => node.getBoundingClientRect().width <= innerWidth));
    await page.screenshot({path: path.join(process.env.BADGE_PROOF_TEST_ARTIFACTS, "print-settings-en-mobile.png")});
    await page.locator("#cancel-print").click();
    assert.equal(await page.evaluate(() => window.printCalls), 1, "cancel does not print");
    await page.locator("#add-page").click();
    await page.locator("#print").click();
    assert.match(await page.locator("#print-page-total").innerText(), /2 × A4/);
    await page.locator("#continue-print").click();
    await page.waitForFunction(() => window.printCalls === 2);
    await page.emulateMedia({media: "print"});
    const twoPages = await PDFDocument.load(await page.pdf({preferCSSPageSize: true, printBackground: true}));
    assert.equal(twoPages.getPageCount(), 2, "two A4 sheets stay two pages, including scale bars");
    console.log("PASS: print settings guidance in both languages, cancellation, mobile layout, one- and two-page A4 output; Letter failure reproduced.");
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
