import {bytesBase64, base64Bytes, sourceID, sourceType, validateFramings} from "./library-store.js";

const invalid = () => Object.assign(new Error("invalidBackup"), {code: "invalidBackup"});
export async function makeBackup(library, preferences) {
  const response = await library.call("/api/library");
  if (!response.ok) throw invalid();
  const designs = [];
  for (const record of await response.json()) {
    const original = await library.call("/api/library/" + record.id + "/source");
    if (!original.ok) throw invalid();
    designs.push({id: record.id, name: record.name, type: record.type,
      sizes: record.sizes || [], framings: record.framings || {},
      original: bytesBase64(new Uint8Array(await original.arrayBuffer()))});
  }
  return new Blob([JSON.stringify({format: "badge-proof-backup", version: 1,
    created: new Date().toISOString(), designs, preferences})], {type: "application/json"});
}

export function cleanPreferences(preferences, ids) {
  if (!preferences || !["25", "32", "58"].includes(preferences.size) || !["fr", "en"].includes(preferences.language)) throw invalid();
  const layouts = {};
  const quantities = {};
  for (const size of ["25", "32", "58"]) {
    const layout = preferences.layouts?.[size] || [];
    if (!Array.isArray(layout) || layout.length > 100000) throw invalid();
    layouts[size] = layout.map(item => {
      if (item === null) return null;
      if (!item || !ids.has(item.assetId)) throw invalid();
      const crop = validateFramings({[size]: item})[size];
      return {assetId: item.assetId, ...crop};
    });
    quantities[size] = {};
    for (const [id, count] of Object.entries(preferences.quantities?.[size] || {})) {
      if (!ids.has(id) || !Number.isInteger(count) || count < 0 || count > 999) throw invalid();
      quantities[size][id] = count;
    }
  }
  return {size: preferences.size, language: preferences.language, layouts, quantities};
}

export async function readBackup(file, inspect) {
  if (!file.size || file.size > 512 * 1024 * 1024) throw invalid();
  let backup;
  try {backup = JSON.parse(await file.text());} catch {throw invalid();}
  if (backup.format !== "badge-proof-backup" || backup.version !== 1 || !Array.isArray(backup.designs) || backup.designs.length > 10000) throw invalid();
  const records = [];
  const ids = new Set();
  for (const entry of backup.designs) {
    const bytes = base64Bytes(entry.original);
    if (!bytes.length || bytes.length > 64 * 1024 * 1024 || await sourceID(bytes) !== entry.id || ids.has(entry.id)) throw invalid();
    const type = sourceType(bytes);
    if (type !== entry.type || typeof entry.name !== "string" || !entry.name.length || entry.name.length > 240 ||
        !Array.isArray(entry.sizes) || entry.sizes.some(size => !["25", "32", "58"].includes(size))) throw invalid();
    ids.add(entry.id);
    // Reinspect the original; cached resolution claims from an imported file
    // are not trusted. Thumbnails are rebuilt rather than included in backups.
    const {info, preview} = await inspect(new File([bytes], entry.name, {type}));
    records.push({id: entry.id, name: entry.name, type, size: bytes.length,
      sizes: entry.sizes, framings: validateFramings(entry.framings), info, preview,
      source: new Blob([bytes], {type})});
  }
  return {records, preferences: cleanPreferences(backup.preferences, ids)};
}
