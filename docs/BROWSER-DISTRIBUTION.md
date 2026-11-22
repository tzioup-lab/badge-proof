# Browser distribution decision

Accepted and shipped 2026-11-22 in [PR #3](https://github.com/tzioup-lab/badge-proof/pull/3). See [current status and next steps](STATUS.md). The user selected an installable browser app after declining paid Apple Developer membership. No paid signing or hosting is part of this route.

## Boundaries

The published application is static HTML/CSS/JavaScript on GitHub Pages under `/badge-proof/`. `build_site.py` publishes an allowlist of application files and bundled vendor libraries. Originals, backups, disk libraries, server code and development files are excluded.

The existing renderer and physical badge geometry remain shared with the optional local-server version. `library-store.js` supplies a browser IndexedDB library through the same library operations; on a localhost installation with the existing API it retains disk-library behavior. Hosted copies never try to send library operations to a remote server.

Library metadata records hold cached previews, quality metadata, intended-size tags and per-size crop presets. Byte-identical originals are stored separately as binary buffers in IndexedDB, avoiding Safari-engine Blob storage failures and loading originals only when needed. Source and metadata writes share one transaction. The schema-v1 development database upgrades without changing original bytes; no schema-v1 build was publicly deployed. Layouts, quantities and language remain browser preferences. There is no cloud account or design synchronization. Users are told that clearing site storage or changing browsers/apps can remove or separate their library.

## Backup and migration

The versioned `.badgeproof` format is a store-only ZIP archive (v2), with original bytes plus JSON IDs, size/crop metadata and sheet preferences. It avoids base64 inflation and the old JSON text-size ceiling. Legacy JSON v1 backups can still be imported. New archives support up to 10,000 designs, 64 MiB per original, 10 MiB of metadata and a total below the ZIP32 4 GiB limit; export rejects unsupported totals before downloading an incomplete file. IDs are verified against SHA-256; source types are checked and originals are reparsed to regenerate previews and quality metadata. Validation completes before writes. A single IndexedDB transaction merges the records, so corrupt files and failed library transactions do not partly overwrite originals.

Import requires an explicit review/confirmation. Matching originals retain their IDs and receive the backup's metadata; unrelated library entries remain. Sheet preferences are replaced with the backed-up preferences. Local copies can export using the same interface without deleting disk files. No silent migration across browser origins is attempted.

## Offline and updates

Every build has a version plus a content hash. Static asset URLs are versioned. The service worker fetches the entire new application with per-asset integrity checks before it is eligible to activate. A failed install leaves the previous cache usable. User-library content is never placed in the service-worker asset cache.

A waiting update requires Reload with the new version. Active operations, print sessions and open dialogs block that action. Other windows are not forcibly reloaded. Older versioned asset caches remain while other windows may still need them. With one window left at activation, obsolete application caches are removed. Library data is outside these application caches.

The app checks on load and hourly while open; manual checking is also available. Offline mode keeps the installed version usable. First-use offline availability starts after the initial asset cache completes, and its state is shown in Help and backups.

## Deliberate limitations

Browser URL imports require the remote source to allow cross-origin access. The fallback is downloading the source file and importing it. No public proxy is introduced. The original local server keeps its existing URL downloader.

Browser persistence requests are best-effort and do not protect against a user clearing site data. Backups remain necessary. Safari Dock applications have separate website storage from Safari; users should install first or migrate with a backup.

Automated browser-engine tests are distinct from operating-system installation and physical print acceptance. Direct print still requires A4, margins None and explicit 100%; PDF export provides an alternative when a browser's print dialog differs.

## Verification

`tests/browser-app.cjs` tests subdirectory hosting, indexed library/framing, backup roundtrip/corruption, optional local-server migration, offline PDF/print, URL-access fallback, two sequential app versions, deferral, active-print protection, another window retaining work and a corrupted next release failing safely. Tests use synthetic artwork and assert no artwork POST requests.
