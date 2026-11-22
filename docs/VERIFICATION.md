# Verification baseline

Last reconciled 2026-11-22. Browser app v0.3.0 includes guided help and the compact workspace. [Current status and next steps](STATUS.md) distinguishes shipped work from manual acceptance. The earlier local-tool evidence below remains relevant to its shared composer.

## Verified locally on macOS / Chrome

- Importing PNG, JPEG, WebP and PDF artwork; original bytes retained.
- Disk library persistence, cached thumbnails and lazy original-file loading.
- Search, intended-size tags and a 42-design scrolling library with reachable controls.
- Quantities 5 + 10 + 20: two A4 pages at 25 mm; six pages at 58 mm.
- Multipage clean PDF export and browser print layout.
- Effective resolution: approximately 455 PPI for a high-resolution bitmap in a native PDF, 43 PPI for a deliberately low-resolution PDF fixture, and separate recognition of vector-only content.
- Crop dragging, zoom and resolution advice; warning when shrinking leaves insufficient bleed.
- Direct HTTP/HTTPS image/PDF imports; webpage and unsupported-scheme rejection.
- French/English interface and a narrow 390 px viewport.
- Saved framing reused in a new circle, in a fresh browser with no local layout data, and in quantity batches. Separate 58 mm and 25 mm crops remain independent. Original source SHA-256 is unchanged.
- Missing/corrupt vendor detection, offline failure, checksum rejection, package repair and simulated missing-Python Mac startup.

## Printing feedback and regression

A user reported that a printed 50 mm scale bar measured approximately 47 mm with default print settings. Both screenshots used Letter paper for A4 artwork. Removing margins restored scale but sent the bar onto another page.

The regression reproduced two-page overflow with a Letter override; A4 with zero margins retained one page. The Print action now shows explicit A4 / None / Custom 100% settings and the expected page count. One- and two-page A4 layouts were checked without extra scale-bar pages.

## Included repeatable checks

- `bootstrap_check.py`: isolated dependency repair and Mac launcher simulation.
- `tests/saved-framing.cjs`: per-size disk persistence, new-copy and batch reuse, thumbnail framing, invalid-value rejection and original byte preservation.
- `tests/print-settings.cjs`: bilingual print reminder, cancellation, mobile layout, reproduced Letter overflow and correct one-/two-page A4 output.
- `npm test`: starts its own temporary server/library and runs the archive, saved-framing, print-settings and browser-app checks.

Earlier broad integration checks were performed in the development workspace. Their private artwork and machine-specific scripts are not included in this repository.

## Remaining manual acceptance

[Issue #2](https://github.com/tzioup-lab/badge-proof/issues/2) owns the browser-route sign-off:

- Safari Add to Dock on macOS Sonoma 14+ and Chrome/Edge installation on Windows, including offline reopening and backup import.
- A subsequent deployed version: defer then accept its update on each OS; verify retained originals, framing and settings.
- Physical printing: measure the 50 mm bar and relevant circles, check page count, cut and press a badge.
- Inspect lettering, contrast and important detail placement for each design; numerical resolution does not prove visual suitability.

Optional local-launcher limitations are separate: the missing-Python Windows flow has not run on Windows hardware, and an actual clean-Mac Python installation has not been performed (the latter was simulated). Neither is required by the browser app.

## Browser app release (2026-11-22)

The free browser route replaces the proposed paid Mac-signing route. Installation and update instructions are in the README. Nothing is uploaded from the design library.

`tests/browser-app.cjs` serves the production static build under `/badge-proof/` and uses synthetic files in isolated browser profiles. Locally exercised Chrome and WebKit (Safari engine); GitHub Checks also runs Chromium, Firefox and WebKit on Linux.

Verified behaviors:

- Browser library persistence and byte-identical PNG/PDF originals; per-size reusable framing; quantities and multipage layouts.
- Atomic source/metadata storage as binary buffers. A reproducible WebKit Blob-write error motivated this storage choice. Schema-v1 development records upgrade with original hashes and framing intact; no v1 schema was publicly deployed.
- Original disk-library export to browser import without deleting the source, including original hashes and saved framing.
- New ZIP-based `.badgeproof` export/import, legacy JSON import, damaged-file rejection and standard Python ZIP-reader interoperability. `tests/archive.cjs` checks a synthetic archive exceeding 512 MiB and rejects ZIP32 overflow before download.
- Native IndexedDB transaction aborts during initial import and restore: no partial entries after reload, previous originals/crops retained. This simulates interrupted writes, not physical disk exhaustion.
- Panorama fit-safe framing below 10% survives saved framing and backup roundtrip.
- Offline document reload, original loading, clean PDF export and direct-print document generation. Exported pages measure 210 × 297 mm. WebKit offline tests disconnect the test origin's sockets, avoiding a driver-specific offline-toggle navigation error.
- URL import when CORS permits; clear download/import fallback when blocked. The expected WebKit access-control error is isolated in the test; other page errors fail it.
- Two sequential application versions: background detection, Later, explicit reload, retained originals/layouts, print guard and another window's unsaved input retained.
- An integrity-invalid next release is refused; the previous version still opens offline.
- English/French UI and 390 px viewport without horizontal overflow. No artwork POST requests occur.

These engine checks do not certify Safari's Add to Dock flow, a Windows app installation or actual printer output. Those remain manual acceptance checks. The optional Python-launcher checks above are separate from the browser app, which needs no Python.

## Published release evidence

- [Merged-main Checks](https://github.com/tzioup-lab/badge-proof/actions/runs/45056554078): Chromium, Firefox and WebKit passed for application commit `29cb01d`.
- [Pages publication](https://github.com/tzioup-lab/badge-proof/actions/runs/45056659110): succeeded for that checked commit.
- Live HTTPS v0.2.0: isolated Chrome profile, synthetic PNG import, seven-copy/two-page 58 mm layout, offline reload and clean PDF export. Both exported pages measured 210 × 297 mm; zero page errors and artwork POST requests. Hosted `.mjs` used `text/javascript`.
- Existing local interface: portable backup exported and original SHA-256 values checked. Every disk-library file hash remained unchanged. User-library import into the hosted browser app was not confirmed; automated migration coverage above used isolated test data.

Evidence is also linked from [delivery issue #1](https://github.com/tzioup-lab/badge-proof/issues/1). No real artwork or portable library backup is committed to this public repository.

## Guided help and compact workspace (v0.3.0)

[Issue #5](https://github.com/tzioup-lab/badge-proof/issues/5) defines this change. The six-step nonmodal walkthrough is optional and does not write library or sheet data. Written Help is independent and retains backup/update controls. General design advice moved into Help to reduce space above the sheet; actionable low-resolution warnings remain visible.

`tests/guidance.cjs`, called by the production-build browser suite, checks French/English tour navigation, Escape/focus restoration, independent FAQ access, keyboard file-picker access, unchanged saved preferences, live warnings, 320/390/768/1000/1440 px layouts and exclusion from print output. The upload box measures about 61 px versus the previous roughly 130 px. A deterministic regression also dismisses the tour and focuses upload in the same task: the queued dialog close event must not steal the next keyboard action. The update test also refuses reload while the walkthrough is open. New guidance assets are included in the offline asset manifest; the existing offline, backup, multi-window update, corrupt-update and exact-A4 print tests continue to run.

Local Chrome and WebKit runs passed these behaviors and the existing regressions. GitHub Checks runs all three engines and retains synthetic screenshots under `test-results/<engine>/`. OS installation and physical printer acceptance remain #2; this UI change does not complete those runs.
