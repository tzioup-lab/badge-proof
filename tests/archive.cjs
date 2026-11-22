const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const source = fs.readFileSync(path.join(__dirname, "../archive.js"));
  const {writeArchive, readArchive} = await import("data:text/javascript;base64," + source.toString("base64"));
  const block = new Blob([new Uint8Array(1024 * 1024)]);
  const original = new Blob(Array(64).fill(block));
  const entries = [{name: "badge-proof.json", blob: new Blob(['{"test":"archive bounds"}'])}];
  for (let index = 0; index < 9; index++) entries.push({name: "originals/" + String(index).padStart(64, "0"), blob: original});
  const archive = await writeArchive(entries);
  assert.ok(archive.size > 512 * 1024 * 1024, "archive exercises the old backup size failure");
  const opened = await readArchive(archive);
  assert.equal(opened.count, 10);
  assert.equal(new TextDecoder().decode((await opened.read("badge-proof.json")).bytes), '{"test":"archive bounds"}');
  assert.equal((await opened.read(entries[1].name)).bytes.length, 64 * 1024 * 1024);
  await assert.rejects(readArchive(archive.slice(0, archive.size - 1)), error => error.code === "invalidBackup");
  // Blob parts share their backing block; this checks ZIP32's boundary without
  // allocating or reading four gigabytes.
  await assert.rejects(writeArchive([{name: "badge-proof.json", blob: new Blob(Array(4096).fill(block))}]), error => error.code === "backupTooLarge");
  console.log("PASS: binary archive larger than 512 MiB, exact entry read, truncation rejection and pre-download ZIP32 size guard.");
})().catch(error => {console.error(error); process.exitCode = 1;});
