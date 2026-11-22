// The browser library separates metadata and binary originals. The local server remains
// a source of portable-library backups, and never receives browser-library data.
const MAX_FILE = 64 * 1024 * 1024;
const SIZES = ["25", "32", "58"];
const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {"Content-Type": "application/json"}});
const problem = code => Object.assign(new Error(code), {code});

export function bytesBase64(bytes) {
  let text = "";
  for (let offset = 0; offset < bytes.length; offset += 16384) text += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  return btoa(text);
}
export function base64Bytes(value) {
  if (typeof value !== "string") throw problem("invalidBackup");
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}
export async function sourceID(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
}
export function sourceType(bytes) {
  if (bytes[0] === 137 && String.fromCharCode(...bytes.subarray(1, 8)) === "PNG\r\n\x1a\n") return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-") return "application/pdf";
  if (String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  throw problem("unsupported");
}
function metadata(record) {
  const {source, preview, ...info} = record;
  return info;
}
const blobOf = (value, type) => value instanceof Blob ? value : new Blob([value], {type});
function validateInfo(info) {
  if (!info || typeof info !== "object" || ![info.width, info.height].every(value => Number.isFinite(value) && value > 0)) throw problem("invalidBackup");
}
export function validateFramings(framings = {}) {
  if (!framings || typeof framings !== "object" || Array.isArray(framings)) throw problem("invalidBackup");
  const clean = {};
  for (const [size, crop] of Object.entries(framings)) {
    if (!SIZES.includes(size) || !crop || !Number.isFinite(crop.zoom) || crop.zoom <= 0 || crop.zoom > 2 ||
        ![crop.x, crop.y].every(value => Number.isFinite(value) && Math.abs(value) <= 70)) throw problem("invalidBackup");
    clean[size] = {zoom: crop.zoom, x: crop.x, y: crop.y};
  }
  return clean;
}

export async function openLibrary() {
  // Only the existing localhost installation has a disk-library API. Hosted
  // copies never try a remote API or send artwork to the site's web server.
  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
    try {
      const response = await fetch("/api/library");
      if (response.ok && response.headers.get("content-type")?.includes("application/json") && Array.isArray(await response.json())) {
        return {local: true, call: (path, options) => fetch(path, options), previewURL: record => "/api/library/" + record.id + "/preview"};
      }
    } catch {}
  }
  let database;
  try {
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("badge-proof-library", 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("designs")) db.createObjectStore("designs", {keyPath: "id"});
        if (!db.objectStoreNames.contains("sources")) {
          const sources = db.createObjectStore("sources");
          const designs = request.transaction.objectStore("designs");
          designs.openCursor().onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return;
            const record = cursor.value;
            if (record.source) {sources.put(record.source, record.id); delete record.source; cursor.update(record);}
            cursor.continue();
          };
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(problem("storageUnavailable"));
    });
  } catch {throw problem("storageUnavailable");}
  database.onversionchange = () => database.close();
  const previews = new Map();
  function transaction(mode, task) {
    return new Promise((resolve, reject) => {
      const tx = database.transaction(["designs", "sources"], mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(problem(tx.error?.name === "QuotaExceededError" ? "storageFull" : "storageUnavailable"));
      try {task(tx.objectStore("designs"), value => {result = value;}, tx.objectStore("sources"));} catch (error) {tx.abort(); reject(error);}
    });
  }
  const get = id => transaction("readonly", (store, done) => {store.get(id).onsuccess = event => done(event.target.result);});
  return {
    local: false,
    async previewURL(record) {
      if (!previews.has(record.id)) {
        const item = await get(record.id);
        if (!item?.preview) throw problem("storageUnavailable");
        previews.set(record.id, URL.createObjectURL(blobOf(item.preview, "image/png")));
      }
      return previews.get(record.id);
    },
    async restore(records) {
      // Validation/parsing occurs before this single transaction, so a failed
      // restore never leaves a partly imported or overwritten library.
      const prepared = [];
      for (const record of records) {
        const {source, preview, ...info} = record;
        prepared.push({info: {...info, preview: await preview.arrayBuffer()}, bytes: await source.arrayBuffer()});
      }
      await transaction("readwrite", (store, done, sources) => {
        for (const record of prepared) {store.put(record.info); sources.put(record.bytes, record.info.id);}
      });
      for (const url of previews.values()) URL.revokeObjectURL(url);
      previews.clear();
    },
    async call(path, options = {}) {
      const method = options.method || "GET";
      if (path === "/api/library" && method === "GET") {
        const records = await transaction("readonly", (store, done) => {store.getAll().onsuccess = event => done(event.target.result);});
        return json(records.map(metadata).sort((a, b) => a.name.localeCompare(b.name)));
      }
      if (path === "/api/library" && method === "POST") {
        const bytes = new Uint8Array(options.body);
        if (!bytes.length || bytes.length > MAX_FILE) throw problem("fileTooLarge");
        const type = sourceType(bytes);
        const id = await sourceID(bytes);
        const name = decodeURIComponent(options.headers["X-File-Name"]).slice(0, 240);
        const initial = options.initial ? {...options.initial, preview: await options.initial.preview.arrayBuffer()} : {};
        const record = {id, name, type, size: bytes.length, ...initial};
        const saved = await transaction("readwrite", (store, done, sources) => {
          store.get(id).onsuccess = event => {
            const existing = event.target.result;
            if (!existing) {store.put(record); sources.put(bytes.buffer, id);}
            done(existing || record);
          };
        });
        return json(metadata(saved));
      }
      const match = path.match(/^\/api\/library\/([a-f0-9]{64})(?:\/(source|preview))?$/);
      if (!match) return json({}, 404);
      const [, id, part] = match;
      if (method === "GET") {
        const record = await get(id);
        const data = part === "source" ? await transaction("readonly", (store, done, sources) => {
          sources.get(id).onsuccess = event => done(event.target.result);
        }) : record?.preview;
        return data ? new Response(blobOf(data, part === "source" ? record.type : "image/png")) : json({}, 404);
      }
      if (method === "DELETE") {
        await transaction("readwrite", (store, done, sources) => {store.delete(id); sources.delete(id);});
        if (previews.has(id)) URL.revokeObjectURL(previews.get(id));
        previews.delete(id);
        return json({removed: id});
      }
      if (method === "PATCH") {
        const payload = JSON.parse(options.body);
        if (payload.sizes && (!Array.isArray(payload.sizes) || payload.sizes.some(size => !SIZES.includes(size)))) throw problem("invalidBackup");
        if (payload.info) validateInfo(payload.info);
        let framing;
        if (payload.framing) framing = validateFramings({[payload.framing.size]: payload.framing});
        const preview = payload.preview ? base64Bytes(payload.preview).buffer : null;
        const saved = await transaction("readwrite", (store, done) => {
          store.get(id).onsuccess = event => {
            const record = event.target.result;
            if (!record) {done(null); return;}
            if (payload.info) record.info = payload.info;
            if (payload.sizes) record.sizes = payload.sizes;
            if (framing) record.framings = {...record.framings, ...framing};
            if (preview) record.preview = preview;
            store.put(record);
            done(record);
          };
        });
        return saved ? json(metadata(saved)) : json({}, 404);
      }
      return json({}, 405);
    },
  };
}

export async function importURL(url, local) {
  let address;
  try {address = new URL(url);} catch {throw problem("urlUnsupported");}
  if (!["http:", "https:"].includes(address.protocol) || address.username || address.password) throw problem("urlUnsupported");
  if (local) return fetch("/api/import-url", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({url})});
  try {
    const response = await fetch(address, {credentials: "omit", referrerPolicy: "no-referrer"});
    if (!response.ok || Number(response.headers.get("content-length")) > MAX_FILE) throw problem("urlBlocked");
    const chunks = [];
    let length = 0;
    const reader = response.body.getReader();
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_FILE) {await reader.cancel(); throw problem("fileTooLarge");}
      chunks.push(value);
    }
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    const mime = sourceType(bytes);
    const extension = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "application/pdf": ".pdf"}[mime];
    let name = decodeURIComponent(new URL(response.url).pathname.split("/").pop() || "design");
    if (!/\.(pdf|png|jpe?g|webp)$/i.test(name)) name += extension;
    return new Response(bytes, {headers: {"Content-Type": mime, "X-File-Name": encodeURIComponent(name)}});
  } catch (error) {throw problem(error.code === "fileTooLarge" ? error.code : "urlBlocked");}
}
