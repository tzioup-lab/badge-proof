const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const crypto = require("node:crypto");
const {spawnSync} = require("node:child_process");
const engine = process.env.BADGE_PROOF_ENGINE || "chromium";
const browserType = require("playwright")[engine];
const {PDFDocument} = require("../vendor/pdf-lib.min.js");

const root = path.resolve(__dirname, "..");
const archiveModule = import("data:text/javascript;base64," + fs.readFileSync(path.join(root, "archive.js")).toString("base64"));
const initialVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version;
const versionAfter = count => initialVersion.replace(/\d+$/, value => String(Number(value) + count));
const python = process.env.BADGE_PROOF_PYTHON || (process.platform === "win32" ? "python" : "python3");
const ready = page => page.locator("main:not([inert])").waitFor({timeout: 60000});
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
async function listen(server) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return "http://127.0.0.1:" + server.address().port;
}
function build(folder, source = root) {
  const result = spawnSync(python, [path.join(source, "build_site.py"), folder], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
}
async function backup(page, target) {
  await page.locator("#help").click();
  const downloaded = page.waitForEvent("download");
  await page.locator("#export-backup").click();
  await (await downloaded).saveAs(target); await ready(page);
  await page.locator("#close-help").click();
  const {readArchive} = await archiveModule;
  const archive = await readArchive(new Blob([fs.readFileSync(target)]));
  const description = JSON.parse(new TextDecoder().decode((await archive.read("badge-proof.json")).bytes));
  for (const design of description.designs) design.original = Buffer.from((await archive.read("originals/" + design.id)).bytes).toString("base64");
  return description;
}
async function restore(page, file) {
  await page.locator("#help").click();
  await page.locator("#import-backup").setInputFiles(file); await ready(page);
  await page.locator("#backup-review[open]").waitFor();
  await page.locator("#confirm-restore").click(); await ready(page);
}

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "badge-proof-web-test-"));
  const artifacts = path.join(root, "test-results"); fs.mkdirSync(artifacts, {recursive: true});
  let current = path.join(temp, "site-v1"); build(current);
  let networkDown = false;
  const mime = {".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json"};
  const server = http.createServer((req, res) => {
    if (networkDown) {req.socket.destroy(); return;}
    const url = new URL(req.url, "http://local");
    if (!url.pathname.startsWith("/badge-proof/")) {res.writeHead(404); res.end(); return;}
    const relative = url.pathname.slice("/badge-proof/".length) || "index.html";
    const file = path.resolve(current, relative);
    if (!file.startsWith(current + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
    res.writeHead(200, {"Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store"});
    res.end(fs.readFileSync(file));
  });
  const imageBytes = fs.readFileSync(path.join(__dirname, "fixtures/high-resolution.png"));
  const images = http.createServer((req, res) => {
    res.writeHead(200, {"Content-Type": "image/png", ...(req.url === "/allowed.png" ? {"Access-Control-Allow-Origin": "*"} : {})});
    res.end(imageBytes);
  });
  const base = await listen(server) + "/badge-proof/";
  const imageBase = await listen(images);
  const browser = await browserType.launch({channel: engine === "chromium" ? process.env.BADGE_PROOF_BROWSER || undefined : undefined, headless: true});
  let page;
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
    // WebKit's protocol offline toggle can abort cache-served navigations with
    // an internal error. Cutting the origin's actual socket tests the same
    // unavailable-site behavior without that driver-specific interception.
    const offline = async value => {if (engine === "webkit") networkDown = value; else await context.setOffline(value);};
    await context.addInitScript(() => {window.printCalls = 0; window.print = () => window.printCalls++;});
    page = await context.newPage();
    const errors = []; const uploads = [];
    page.on("pageerror", error => {
      // WebKit also emits a pageerror for our deliberately CORS-denied URL.
      // The UI fallback is asserted below; every other error remains a failure.
      if (engine === "webkit" && error.message.includes(new URL(imageBase).host + "/denied.png") && error.message.endsWith("due to access control checks.")) return;
      errors.push(error.message);
    });
    page.on("request", req => {if (req.method() === "POST") uploads.push(req.url());});
    await page.goto(base); await ready(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.match(await page.locator("#library-location").innerText(), /navigateur/);
    await page.locator("#files").setInputFiles(path.join(__dirname, "fixtures/high-resolution.png")); await ready(page);
    assert.equal(await page.locator(".asset").count(), 1, await page.locator("#status").innerText());
    await page.locator("#zoom-number").fill("141");
    await page.locator("#x-number").fill("3.5");
    await page.locator("#edit-design").click(); await ready(page);
    await page.locator("#editor-save-framing").click(); await ready(page);
    await page.locator("#close-editor").click();
    await page.locator(".slot").nth(1).click(); await page.locator(".asset").click();
    assert.equal(await page.locator("#zoom-number").inputValue(), "141");
    const firstBackup = path.join(temp, "first.badgeproof");
    let saved = await backup(page, firstBackup);
    assert.equal(hash(Buffer.from(saved.designs[0].original, "base64")), hash(imageBytes));
    assert.equal(saved.designs[0].framings["58"].zoom, 1.41);

    // Seed the previous IndexedDB schema before loading the application. No
    // schema-v1 release was published; this still pins byte-preserving upgrades.
    {
      const legacy = await browser.newContext();
      const legacyPage = await legacy.newPage();
      await legacyPage.goto(base + "seed.html");
      await legacyPage.evaluate(async ({id, original, bufferOnly}) => {
        const bytes = Uint8Array.from(atob(original), char => char.charCodeAt(0));
        const binary = bufferOnly ? bytes.buffer : new Blob([bytes], {type: "image/png"});
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open("badge-proof-library", 1);
          request.onupgradeneeded = () => request.result.createObjectStore("designs", {keyPath: "id"});
          request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const tx = db.transaction("designs", "readwrite");
          tx.objectStore("designs").put({id, name: "legacy.png", type: "image/png", size: bytes.length,
            source: binary, preview: binary, sizes: ["58"], framings: {"58": {zoom: 1.41, x: 3.5, y: 0}}});
          tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
        });
        db.close();
      }, {id: saved.designs[0].id, original: saved.designs[0].original, bufferOnly: engine === "webkit"});
      await legacyPage.goto(base); await ready(legacyPage);
      assert.equal(await legacyPage.locator(".asset").count(), 1);
      const upgraded = await backup(legacyPage, path.join(temp, "schema-upgrade.badgeproof"));
      assert.equal(upgraded.designs[0].original, saved.designs[0].original);
      assert.deepEqual(upgraded.designs[0].framings, saved.designs[0].framings);
      await legacy.close();
    }

    const pdf = await PDFDocument.create(); pdf.addPage([70 * 72 / 25.4, 70 * 72 / 25.4]).drawText("Synthetic vector badge", {x: 12, y: 100, size: 12});
    const vector = path.join(temp, "vector.pdf"); fs.writeFileSync(vector, await pdf.save());
    await page.locator("#files").setInputFiles(vector); await ready(page);
    await page.locator("#preset").selectOption("25");
    await page.locator("[data-quantity]").nth(0).fill("5");
    await page.locator("[data-quantity]").nth(1).fill("30");
    await page.locator("#build-batch").click();
    assert.match(await page.locator("#page-count").innerText(), /1 \/ 2/);
    const fullBackup = path.join(temp, "all.badgeproof"); saved = await backup(page, fullBackup);
    const fresh = await browser.newContext({acceptDownloads: true});
    const restoredPage = await fresh.newPage();
    await restoredPage.goto(base); await ready(restoredPage);
    await restore(restoredPage, fullBackup);
    assert.equal(await restoredPage.locator(".asset").count(), 2);
    assert.match(await restoredPage.locator("#page-count").innerText(), /1 \/ 2/);
    const roundtrip = await backup(restoredPage, path.join(temp, "roundtrip.badgeproof"));
    assert.deepEqual(roundtrip.designs.map(d => d.id).sort(), saved.designs.map(d => d.id).sort());
    for (const design of roundtrip.designs) assert.equal(hash(Buffer.from(design.original, "base64")), design.id);
    const corrupt = path.join(temp, "corrupt.badgeproof");
    const broken = fs.readFileSync(fullBackup);
    const originalPosition = broken.indexOf(imageBytes);
    assert.ok(originalPosition > 0);
    broken[originalPosition + 50] ^= 1;
    fs.writeFileSync(corrupt, broken);
    await restoredPage.locator("#help").click();
    await restoredPage.locator("#import-backup").setInputFiles(corrupt); await ready(restoredPage);
    assert.match(await restoredPage.locator("#status").innerText(), /invalide|endommagée/);
    assert.equal(await restoredPage.locator(".asset").count(), 2);
    if (process.env.BADGE_PROOF_TEST_URL) {
      const localPage = await fresh.newPage();
      await localPage.goto(process.env.BADGE_PROOF_TEST_URL); await ready(localPage);
      assert.match(await localPage.locator("#library-location").innerText(), /ordinateur/);
      const migrationFile = path.join(temp, "from-local.badgeproof");
      const diskBackup = await backup(localPage, migrationFile);
      await restore(restoredPage, migrationFile);
      const migrated = await backup(restoredPage, path.join(temp, "migrated.badgeproof"));
      for (const original of diskBackup.designs) {
        const copy = migrated.designs.find(record => record.id === original.id);
        assert.equal(copy.original, original.original, "local-to-browser originals preserved");
        assert.deepEqual(copy.framings, original.framings, "local-to-browser framing preserved");
      }
      await localPage.close();
    }
    const panorama = Buffer.from(await restoredPage.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 60;
      const context = canvas.getContext("2d"); context.fillStyle = "#5835a7"; context.fillRect(0, 0, 1200, 60);
      return canvas.toDataURL("image/png").split(",")[1];
    }), "base64");
    await restoredPage.locator("#files").setInputFiles({name: "panorama.png", mimeType: "image/png", buffer: panorama}); await ready(restoredPage);
    await restoredPage.locator("#fit-safe").click();
    const fittedZoom = Number(await restoredPage.locator("#zoom-number").inputValue());
    assert.ok(fittedZoom > 0 && fittedZoom < 10);
    await restoredPage.locator("#edit-design").click(); await ready(restoredPage);
    await restoredPage.locator("#editor-save-framing").click(); await ready(restoredPage);
    await restoredPage.locator("#close-editor").click();
    const panoramaBackup = path.join(temp, "panorama.badgeproof"); const legacyBackup = await backup(restoredPage, panoramaBackup);
    await restore(restoredPage, panoramaBackup);
    await restoredPage.locator('.asset[title="panorama.png"]').click();
    assert.ok(Math.abs(Number(await restoredPage.locator("#zoom-number").inputValue()) - fittedZoom) < .000001);
    const standardZip = spawnSync(python, ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print('ZIP interoperability passed')", panoramaBackup], {encoding: "utf8"});
    assert.equal(standardZip.status, 0, standardZip.stderr);
    legacyBackup.version = 1;
    const legacyFile = path.join(temp, "legacy-json.badgeproof"); fs.writeFileSync(legacyFile, JSON.stringify(legacyBackup));
    await restore(restoredPage, legacyFile);
    await restoredPage.locator('.asset[title="panorama.png"]').click();
    assert.ok(Math.abs(Number(await restoredPage.locator("#zoom-number").inputValue()) - fittedZoom) < .000001);
    await fresh.close();

    {
      const limited = await browser.newContext();
      await limited.addInitScript(() => {
        const transaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(...args) {
          const tx = transaction.apply(this, args);
          if (args[1] === "readwrite" && window.abortNextWrite) {
            window.abortNextWrite = false;
            queueMicrotask(() => tx.abort());
          }
          return tx;
        };
      });
      const limitedPage = await limited.newPage(); await limitedPage.goto(base); await ready(limitedPage);
      await limitedPage.evaluate(() => {window.abortNextWrite = true;});
      await limitedPage.locator("#files").setInputFiles(path.join(__dirname, "fixtures/high-resolution.png")); await ready(limitedPage);
      assert.equal(await limitedPage.locator(".asset").count(), 0, "an aborted transaction does not leave a partially imported design");
      assert.match(await limitedPage.locator("#status").innerText(), /place|stockage/);
      await limitedPage.reload(); await ready(limitedPage);
      assert.equal(await limitedPage.locator(".asset").count(), 0);
      await restore(limitedPage, firstBackup);
      await limitedPage.locator("#help").click();
      await limitedPage.locator("#import-backup").setInputFiles(fullBackup); await ready(limitedPage);
      await limitedPage.locator("#backup-review[open]").waitFor();
      await limitedPage.evaluate(() => {window.abortNextWrite = true;});
      await limitedPage.locator("#confirm-restore").click(); await ready(limitedPage);
      assert.match(await limitedPage.locator("#status").innerText(), /place|stockage/);
      await limitedPage.reload(); await ready(limitedPage);
      const afterAbort = await backup(limitedPage, path.join(temp, "after-abort.badgeproof"));
      assert.equal(afterAbort.designs.length, 1, "an aborted restore does not partially import");
      assert.equal(afterAbort.designs[0].original, saved.designs.find(d => d.id === afterAbort.designs[0].id).original);
      assert.equal(afterAbort.designs[0].framings["58"].zoom, 1.41);
      await limited.close();
    }

    await page.evaluate(() => {window.beforeOfflineReload = true;});
    await offline(true); await page.reload(); await ready(page);
    assert.equal(await page.evaluate(() => window.beforeOfflineReload), undefined, "offline reload created a fresh document");
    assert.equal(await page.locator(".asset").count(), 2);
    const download = page.waitForEvent("download"); await page.locator("#export").click();
    const offlinePDF = path.join(temp, "offline.pdf"); await (await download).saveAs(offlinePDF); await ready(page);
    const printed = await PDFDocument.load(fs.readFileSync(offlinePDF));
    assert.equal(printed.getPageCount(), 2);
    for (const p of printed.getPages()) {
      assert.ok(Math.abs(p.getWidth() * 25.4 / 72 - 210) < .01);
      assert.ok(Math.abs(p.getHeight() * 25.4 / 72 - 297) < .01);
    }
    await page.locator("#print").click(); await page.locator("#continue-print").click(); await ready(page);
    assert.equal(await page.evaluate(() => window.printCalls), 1);
    assert.equal(await page.locator(".print-page").count(), 2);
    await offline(false);
    await page.locator(".url-import summary").click();
    await page.locator("#design-url").fill(imageBase + "/allowed.png");
    await page.locator("#url-form button").click(); await ready(page);
    assert.doesNotMatch(await page.locator("#status").innerText(), /échoué/);
    await page.locator("#design-url").fill(imageBase + "/denied.png");
    await page.locator("#url-form button").click(); await ready(page);
    assert.match(await page.locator("#status").innerText(), /téléchargez/);
    assert.deepEqual(uploads, [], "artwork never uploaded to a server");

    // A second open window keeps its current edits and old worker assets.
    const other = await context.newPage(); await other.goto(base); await ready(other);
    await other.locator(".url-import summary").click();
    await other.locator("#design-url").fill("https://example.com/unfinished-input");
    const nextSource = path.join(temp, "next-source"); fs.mkdirSync(nextSource);
    for (const name of ["build_site.py", "package.json", "index.html", "composer.js", "composer.css", "presets.js", "quality.js", "library-store.js", "backup.js", "archive.js", "app-shell.js", "service-worker.js", "manifest.webmanifest", "vendor", "icons"]) {
      fs.cpSync(path.join(root, name), path.join(nextSource, name), {recursive: true});
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(nextSource, "package.json"))); pkg.version = versionAfter(1);
    fs.writeFileSync(path.join(nextSource, "package.json"), JSON.stringify(pkg));
    current = path.join(temp, "site-v2"); build(current, nextSource);
    await page.locator("#help").click(); await page.locator("#check-updates").click();
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    await page.locator("#close-help").click();
    assert.equal(await page.locator("#app-version").innerText(), "v" + initialVersion, "no forced update");
    await page.locator("#dismiss-update").click();
    assert.equal(await page.locator("#update-banner").isVisible(), false);
    await page.locator("#help").click(); await page.locator("#check-updates").click(); await page.locator("#close-help").click();
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.locator("#apply-update").click();
    assert.match(await page.locator("#update-text").innerText(), /Terminez/);
    assert.equal(await page.locator("#app-version").innerText(), "v" + initialVersion);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await page.locator("#apply-update").click();
    await page.waitForFunction(version => document.querySelector("#app-version").textContent === "v" + version, versionAfter(1)); await ready(page);
    assert.equal(await page.locator(".asset").count(), 2);
    assert.match(await page.locator("#page-count").innerText(), /1 \/ 2/);
    assert.equal(await other.locator("#design-url").inputValue(), "https://example.com/unfinished-input");
    assert.equal(await other.locator("#app-version").innerText(), "v" + initialVersion, "other window not reloaded");
    await other.close();

    pkg.version = versionAfter(2); fs.writeFileSync(path.join(nextSource, "package.json"), JSON.stringify(pkg));
    current = path.join(temp, "site-broken"); build(current, nextSource);
    fs.appendFileSync(path.join(current, "composer.css"), "/* deliberately corrupted release */");
    await page.locator("#help").click(); await page.locator("#check-updates").click();
    await page.waitForFunction(() => /indisponible/.test(document.querySelector("#shell-status").textContent));
    await page.locator("#close-help").click();
    await offline(true); await page.reload(); await ready(page);
    assert.equal(await page.locator("#app-version").innerText(), "v" + versionAfter(1), "failed update keeps current offline version");
    assert.equal(await page.locator(".asset").count(), 2);
    await page.locator("#language").selectOption("en");
    await page.screenshot({path: path.join(artifacts, "browser-app-wide.png")});
    await page.setViewportSize({width: 390, height: 850}); await page.reload(); await ready(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path: path.join(artifacts, "browser-app-mobile.png")});
    assert.deepEqual(errors, []);
    console.log("PASS: browser library, framing, backup/restore and corrupt rejection; offline PDF/print; CORS guidance; two-version deferred update, active-print guard, multi-window preservation, corrupt-update rollback; mobile layout; zero artwork uploads.");
  } catch (error) {
    if (page) await page.screenshot({path: path.join(artifacts, "browser-app-failure.png")}).catch(() => {});
    throw error;
  } finally {
    await browser.close();
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => images.close(resolve))]);
    fs.rmSync(temp, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
