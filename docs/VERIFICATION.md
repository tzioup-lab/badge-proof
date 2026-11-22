# Verification baseline

Recorded on 2026-11-22. This repository contains the standalone composer, extracted after the saved-framing fix.

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
- `npm test`: starts its own temporary server/library and runs both browser checks.

Earlier broad integration checks were performed in the development workspace. Their private artwork and machine-specific scripts are not included in this repository.

## Remaining acceptance checks

- Run the Windows launcher on Windows hardware, including the missing-Python path.
- Complete an actual Python installation on a clean Mac; the installer flow was simulated locally.
- Check browsers other than the locally exercised Chrome build.
- Print the updated workflow on physical hardware, measure the scale bar and press a badge.
- Inspect lettering, contrast and important detail placement for each design; numerical resolution does not prove visual suitability.
