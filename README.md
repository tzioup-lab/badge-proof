# Badge Proof

A local tool for composing mixed-design A4 button-badge print sheets. Import artwork, save reusable framing, set quantities and print or export a PDF. The interface switches between French and English.

## Open Badge Proof

**[Use Badge Proof](https://tzioup-lab.github.io/badge-proof/)** — free, with no account, terminal or Python installation.

Use it in a modern browser on Mac or Windows. To give it an app icon:

- **Chrome / Edge:** use Install in the browser menu, or the app's Install button when offered.
- **Safari on Mac (Sonoma 14 or newer):** File → Add to Dock.

Install before adding designs. Safari's Dock apps and different browsers can have separate libraries; import a backup if a new app looks empty.

The first complete load prepares offline use. **Help** shows when offline preparation is ready. File import, framing, PDF export and direct print work offline. Importing a remote URL and checking for updates need a connection.

## Guided walkthrough and Help

**Guided walkthrough / Visite guidée** in the header opens six short steps: size, import, copies, framing, printing and backups. Use Back/Next and Show the controls to follow along with your own sheet. Close it at any time, or press Escape. It does not replace your designs or layout.

**Help / Aide** is an independent written reference. Open a FAQ topic for print settings, safe circles, saved framing, resolution, quantities, URL imports, local libraries, installation or updates. Backup and update controls remain in Help. Help can be used without starting the tour.

The upload area and sheet controls are compact, with a stacked/collapsible library on tablet and phone widths. Low-resolution warnings remain visible above the sheet; general guidance is in Help and the inspector.

## Your library and backups

Each device has its own library. Libraries do not automatically sync between devices, browsers, profiles or separate installed-app storage contexts. App updates and design-library transfers are separate: updates are automatic checks with a reload prompt; library transfer is manual backup/import.

Artwork stays in browser storage on your device. The site does not upload your designs or backups. Save a `.badgeproof` backup through **Help → Back up library**. It includes original files, size tags, saved framing, layouts, quantities and language. Keep a copy somewhere outside browser storage. Backups use a ZIP-based format with a total below 4 GiB and up to 10,000 designs (64 MiB each); oversized exports are refused before download. Legacy JSON backups can still be imported.

**Clearing site data can delete the library.** Browser storage protection can be requested in Help, but it does not replace a backup. Changing browser, profile, device or Safari Dock app can open a separate library.

To restore or move devices, choose **Import backup**, review its contents and confirm. Matching design IDs are updated; unrelated designs remain. The backup's sheet settings replace current settings. Invalid/corrupt backups are rejected before library writes; imports commit in one database transaction.

Existing local-server users can export from the updated local interface through Help and import that file into the website. The original `.library` folder is kept. The website cannot silently read a different local installation's files or browser preferences.

## Updates

The app checks for updates on opening and hourly while open. A complete, integrity-checked new version waits behind **Reload with the new version / Later**. It does not force a reload in another window or apply during active work, an open settings dialog or printing. Failed/incomplete downloads leave the current offline version available.

Library data is independent of the cached application version. Normal updates retain it. Manual update checks are in Help.

## Optional local launcher

The original Mac/Windows launchers remain available for running a disk-backed local library. They may open a console and prepare Python. They are not required for the browser app. See [README.txt](README.txt) for that route.

## Compose a sheet

1. Choose **25, 32 or 58 mm**.
2. Drop PNG, JPEG, WebP or PDF files into the library, or import a direct image/PDF URL.
3. Place designs in circles, or set a quantity beneath each thumbnail and choose **Compose these quantities**. Extra A4 pages are created automatically.
4. Open **Crop and check** to drag and zoom artwork. **Save framing** stores that crop in the library for the current badge size. New copies and quantity batches reuse it. **Apply to copies** updates copies already on the sheet.
5. Inspect the safe-area overlay and effective resolution. Print or export the clean PDF; a separate guided proof includes the internal zones.

The library scrolls within its panel and offers search, intended-size tags and a resolution filter. Saved framing appears in thumbnails. Original image/PDF bytes are preserved.

## Print at the correct size

The sheet is **A4**, and the print dialog may retain settings from previous jobs. Check:

| Setting | Value |
| --- | --- |
| Paper | A4, portrait, 210 × 297 mm |
| Margins | None |
| Scale | Custom **100%** |
| Pages per sheet | 1 |
| Headers and footers | Off |

**Measure the 50 mm bar before cutting.** Letter paper is shorter than A4 and can shrink the artwork or push the bar onto another sheet. The app shows a reminder and expected page count before opening the browser's print dialog; it cannot read or enforce the selected printer settings.

Direct printing renders at 300 PPI. PDF export preserves native image pixels and PDF content. Print quality also depends on the source, printer and paper.

## Included templates

| Finished face | Paper cut | Recommended safe circle | Positions per A4 |
| --- | --- | --- | --- |
| 25 mm | 35 mm | 19 mm | 28 |
| 32 mm | 44 mm | 26 mm | 12 |
| 58 mm | 70 mm | 50 mm | 6 |

Coordinates are in [presets.js](presets.js), adapted from the project's existing templates. These are equipment-specific presets. Confirm your own parts and cutter dimensions before a production run. Safe circles are design recommendations.

Resolution checks use actual print size and crop zoom, including supported bitmap-image operations inside PDFs. Vector-only PDF content scales without pixelation; unanalysed PDF operations are flagged. A 25 mm design can print larger if its source has enough pixels. The app does not identify lettering or essential details: inspect text, contrast and safe-area placement visually.

## URL imports

Direct links work when the source permits cross-origin browser downloads. Some sites block this. The app explains the limitation and asks you to download the image/PDF and add the file instead. It does not route private files through a public proxy. The optional local server retains its existing direct-URL importer.

## Development and verification

The hosted app uses bundled JavaScript libraries and browser APIs. Python is used for the static build and optional local server; Node is used for development tests.

```sh
python3 bootstrap.py --check --offline
python3 bootstrap_check.py
npm ci
npx playwright install chromium
npm test
python3 build_site.py
python3 -m http.server 8080 --directory dist
```

`bootstrap_check.py` tests dependency repair in temporary folders and needs network access. On Mac it simulates a missing-Python installation without installing Python. Browser tests use synthetic artwork and a temporary library on an available local port; they do not use saved designs or send jobs to a printer.

The static build contains an explicit asset allowlist: no local library, Python server, private artwork, test fixtures or developer files are published. Successful main-branch checks trigger the GitHub Pages workflow.

For current delivery state, decisions and next steps, start with [Status and next steps](docs/STATUS.md). See also [browser distribution decisions](docs/BROWSER-DISTRIBUTION.md) and [verification evidence and remaining checks](docs/VERIFICATION.md). Actual Safari Dock / Windows installation and physical printing remain separate acceptance checks.

## Dependencies and origin

This standalone composer grew out of the Local Sticker Studio work in [Bumper-Sticker-Generator](https://github.com/tzioup/Bumper-Sticker-Generator). It composes supplied artwork; it does not generate images or slogans.

Bundled PDF libraries and their licenses are in `vendor/`. [dependency-manifest.json](dependency-manifest.json) pins their versions, download locations and SHA-256 checksums. No external CDN is used at runtime.
