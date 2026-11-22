const assert = require("node:assert/strict");
const path = require("node:path");

module.exports = async function checkGuidance(page, artifacts) {
  const snapshot = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("badge-composer-"))));
  const originalViewport = page.viewportSize();
  const originalLanguage = await page.locator("#language").inputValue();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const language of ["fr", "en"]) {
    await page.locator("#language").selectOption(language);
    const before = await snapshot();
    await page.locator("#start-walkthrough").click();
    assert.equal(await page.locator("#walkthrough").evaluate(node => node.open && !node.matches(":modal")), true, "tour allows working with the sheet");
    assert.match(await page.locator("#tour-progress").innerText(), /1.*6/);
    assert.equal(await page.locator("#tour-back").isEnabled(), false);
    if (language === "fr") await page.screenshot({path: path.join(artifacts, "guidance-header-fr.png")});
    await page.locator("#tour-show").click();
    assert.equal(await page.locator(".format-control.tour-target").count(), 1);
    assert.equal(await page.locator("#preset").isEnabled(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#walkthrough").evaluate(node => node.open), false);
    await page.waitForFunction(() => document.activeElement === document.querySelector("#start-walkthrough"));
    assert.equal(await page.locator(".tour-target").count(), 0);
    await page.locator("#start-walkthrough").click();
    await page.locator("#tour-next").click();
    await page.locator("#tour-show").click();
    assert.equal(await page.locator("#drop-zone.tour-target").count(), 1);
    await page.locator("#tour-back").click();
    assert.match(await page.locator("#tour-progress").innerText(), /1.*6/);
    for (let step = 1; step < 6; step++) {
      await page.locator("#tour-next").click();
      assert.match(await page.locator("#tour-progress").innerText(), new RegExp((step + 1) + ".*6"));
    }
    assert.match(await page.locator("#tour-body").innerText(), language === "fr" ? /ne se synchronise/ : /does not sync/);
    await page.locator("#tour-next").click();
    assert.equal(await page.locator("#walkthrough").evaluate(node => node.open), false);
    assert.deepEqual(await snapshot(), before, "walkthrough never modifies saved layouts, quantities, size or language");
    await page.locator("#help").click();
    assert.equal(await page.locator("#walkthrough").evaluate(node => node.open), false, "help is independent of tour");
    if (!await page.locator('[data-topic="printing"]').evaluate(node => node.open)) await page.locator('[data-topic="printing"] summary').click();
    assert.match(await page.locator('[data-topic="printing"] p').innerText(), /A4.*100.*50 mm/);
    if (!await page.locator('[data-topic="library"]').evaluate(node => node.open)) await page.locator('[data-topic="library"] summary').click();
    assert.match(await page.locator('[data-topic="library"] p').innerText(), language === "fr" ? /pas de synchronisation automatique/ : /no automatic sync/);
    assert.equal(await page.locator("#export-backup").isVisible(), true);
    assert.equal(await page.locator("#check-updates").isVisible(), true);
    await page.locator("#close-help").click();
  }
  await page.locator("#start-walkthrough").click();
  await page.locator("#help").click();
  assert.equal(await page.locator("#walkthrough").evaluate(node => node.open), false, "opening Help ends the tour");
  await page.locator("#close-help").click();
  const savedZoom = await page.locator("#zoom-number").inputValue();
  await page.locator("#zoom-number").fill("200");
  assert.equal(await page.locator("#sheet-quality").isVisible(), true, "low-resolution warnings remain visible");
  await page.locator("#zoom-number").fill(savedZoom);
  for (const language of ["fr", "en"]) {
    await page.locator("#language").selectOption(language);
    for (const width of [1440, 1000, 768, 390, 320]) {
      await page.setViewportSize({width, height: width > 440 ? 760 : 650});
      await page.locator("#library-disclosure").evaluate(node => {node.open = true;});
      const dimensions = await page.evaluate(() => {
        const box = document.querySelector("#drop-zone").getBoundingClientRect();
        const sheet = document.querySelector("#sheet").getBoundingClientRect();
        const workspace = document.querySelector(".workspace").getBoundingClientRect();
        return {width: innerWidth, upload: box.height, above: sheet.top - workspace.top, overflow: document.documentElement.scrollWidth > innerWidth};
      });
      assert.ok(dimensions.upload <= 75, "upload box stays approximately half its previous 130px height: " + JSON.stringify(dimensions));
      // System font metrics differ across Linux/macOS engines; constrain the
      // vertical budget without treating a few pixels as an overlap defect.
      assert.ok(dimensions.above <= (width > 440 ? 120 : 200), "compact controls above the sheet: " + JSON.stringify(dimensions));
      assert.equal(dimensions.overflow, false, "no horizontal overflow at " + width);
      await page.locator("#start-walkthrough").click();
      await page.locator("#tour-show").click();
      const panel = await page.locator("#walkthrough").boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= width + 1);
      assert.ok(panel.y >= 0 && panel.y + panel.height <= page.viewportSize().height + 1);
      if (width === 1000 || width === 390) await page.screenshot({path: path.join(artifacts, "guidance-" + language + "-" + width + ".png")});
      await page.emulateMedia({media: "print"});
      assert.equal(await page.locator("#walkthrough").isVisible(), false, "tour is never included in print output");
      await page.emulateMedia({media: "screen"});
      await page.keyboard.press("Escape");
    }
  }
  await page.locator("#drop-zone").focus();
  const chooser = page.waitForEvent("filechooser"); await page.keyboard.press("Enter");
  await (await chooser).setFiles([]);
  await page.locator("main:not([inert])").waitFor();
  await page.setViewportSize(originalViewport);
  await page.locator("#language").selectOption(originalLanguage);
  assert.deepEqual(errors, []);
  console.log("PASS: bilingual independent Help and six-step tour, keyboard dismissal/upload, untouched saved state, compact controls at 320–1440px and print exclusion.");
};
