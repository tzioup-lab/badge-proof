// A deliberately small, uncompressed ZIP subset. Originals are already PNG,
// JPEG, WebP or PDF; Blob parts avoid base64 expansion and giant JSON strings.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_ZIP = 0xffffffff;
const table = Uint32Array.from({length: 256}, (_, byte) => {
  for (let bit = 0; bit < 8; bit++) byte = byte & 1 ? 0xedb88320 ^ byte >>> 1 : byte >>> 1;
  return byte >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = table[(value ^ byte) & 255] ^ value >>> 8;
  return (value ^ 0xffffffff) >>> 0;
}
const invalid = () => Object.assign(new Error("invalidBackup"), {code: "invalidBackup"});
function header(size, signature) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  return {bytes, view};
}

export async function writeArchive(entries) {
  if (entries.length > 65535 || entries.reduce((sum, entry) => sum + entry.blob.size + 76 + encoder.encode(entry.name).length * 2, 22) > MAX_ZIP) {
    throw Object.assign(new Error("backupTooLarge"), {code: "backupTooLarge"});
  }
  const parts = [], directory = [];
  let offset = 0;
  for (const {name, blob} of entries) {
    const filename = encoder.encode(name);
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const local = header(30, 0x04034b50);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x800, true);
    local.view.setUint16(12, 0x21, true); // 1980-01-01, no timezone ambiguity.
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, blob.size, true);
    local.view.setUint32(22, blob.size, true);
    local.view.setUint16(26, filename.length, true);
    parts.push(local.bytes, filename, blob);
    const central = header(46, 0x02014b50);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x800, true);
    central.view.setUint16(14, 0x21, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, blob.size, true);
    central.view.setUint32(24, blob.size, true);
    central.view.setUint16(28, filename.length, true);
    central.view.setUint32(42, offset, true);
    directory.push(central.bytes, filename);
    offset += 30 + filename.length + blob.size;
  }
  const end = header(22, 0x06054b50);
  end.view.setUint16(8, entries.length, true);
  end.view.setUint16(10, entries.length, true);
  end.view.setUint32(12, directory.reduce((sum, part) => sum + part.length, 0), true);
  end.view.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end.bytes], {type: "application/zip"});
}

export async function readArchive(file) {
  if (file.size < 22 || file.size > MAX_ZIP) throw invalid();
  const end = new DataView(await file.slice(-22).arrayBuffer());
  if (end.getUint32(0, true) !== 0x06054b50 || end.getUint32(4, true) !== 0 || end.getUint16(20, true) !== 0 ||
      end.getUint16(8, true) !== end.getUint16(10, true)) throw invalid();
  const count = end.getUint16(10, true), size = end.getUint32(12, true), offset = end.getUint32(16, true);
  if (!count || count > 10001 || size > 4 * 1024 * 1024 || offset + size !== file.size - 22) throw invalid();
  const centralBytes = new Uint8Array(await file.slice(offset, offset + size).arrayBuffer());
  const central = new DataView(centralBytes.buffer);
  const entries = new Map();
  let position = 0;
  for (let index = 0; index < count; index++) {
    if (position + 46 > size || central.getUint32(position, true) !== 0x02014b50 || central.getUint16(position + 10, true) !== 0 ||
        (central.getUint16(position + 8, true) & ~0x800) !== 0 || central.getUint16(position + 34, true) !== 0) throw invalid();
    const length = central.getUint16(position + 28, true);
    const total = 46 + length + central.getUint16(position + 30, true) + central.getUint16(position + 32, true);
    const name = decoder.decode(centralBytes.subarray(position + 46, position + 46 + length));
    const packed = central.getUint32(position + 20, true), unpacked = central.getUint32(position + 24, true);
    if (position + total > size || entries.has(name) || packed !== unpacked ||
        !(name === "badge-proof.json" || /^originals\/[a-f0-9]{64}$/.test(name)) ||
        unpacked > (name === "badge-proof.json" ? 10 : 64) * 1024 * 1024) throw invalid();
    entries.set(name, {size: unpacked, crc: central.getUint32(position + 16, true), offset: central.getUint32(position + 42, true)});
    position += total;
  }
  if (position !== size) throw invalid();
  return {
    count,
    async read(name) {
      const entry = entries.get(name);
      if (!entry || entry.offset + 30 > offset) throw invalid();
      const local = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer());
      if (local.getUint32(0, true) !== 0x04034b50 || local.getUint16(8, true) !== 0 ||
          local.getUint32(14, true) !== entry.crc || local.getUint32(18, true) !== entry.size || local.getUint32(22, true) !== entry.size) throw invalid();
      const filenameLength = local.getUint16(26, true);
      const filename = await file.slice(entry.offset + 30, entry.offset + 30 + filenameLength).text();
      const start = entry.offset + 30 + filenameLength + local.getUint16(28, true);
      if (filename !== name || start + entry.size > offset) throw invalid();
      const blob = file.slice(start, start + entry.size);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (crc32(bytes) !== entry.crc) throw invalid();
      return {blob, bytes};
    },
  };
}
