# Badge Proof

A local tool for composing mixed-design A4 button-badge print sheets. Import artwork, save reusable framing, set quantities and print or export a PDF. The interface switches between French and English.

## Start

Download and extract this repository, then double-click:

- **Mac:** `Ouvrir-le-composeur.command`
- **Windows:** `Ouvrir-le-composeur-Windows.bat`

The launcher checks Python and bundled browser libraries. Missing components are downloaded and verified against pinned checksums. Mac installation may open the official Python installer and require your approval; Windows prepares a missing Python runtime inside `.runtime`. A modern browser is required.

The app opens at <http://127.0.0.1:8770/>. It works offline once dependencies are present. URL imports need access to their source.

If Python 3.10+ is already installed, you can also start it with:

```sh
python3 bootstrap.py --port 8770 --open
```

On Windows, use `py -3` instead of `python3`.

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

## Saved data

Design originals, thumbnails, size tags and per-size framing are stored in `.library` beside `serve.py`. Include that hidden folder in backups or when moving the app. It is excluded from Git.

Sheet layouts, quantities and language are remembered in the browser. These do not follow the library to a different browser. The server listens only on this computer. Remote URL imports download the requested file without forwarding browser cookies or credentials.

French instructions and additional details are in [README.txt](README.txt).

## Development and verification

The application uses only the Python standard library and bundled JavaScript libraries. Node is needed only for browser tests.

```sh
python3 bootstrap.py --check --offline
python3 bootstrap_check.py
npm ci
npx playwright install chromium
npm test
```

`bootstrap_check.py` tests dependency repair in temporary folders and needs network access. On Mac it simulates a missing-Python installation without installing Python. Browser tests use synthetic artwork and a temporary library on an available local port; they do not use saved designs or send jobs to a printer.

See [verification evidence and remaining checks](docs/VERIFICATION.md). Windows launcher execution and physical printing remain separate acceptance checks.

## Dependencies and origin

This standalone composer grew out of the Local Sticker Studio work in [Bumper-Sticker-Generator](https://github.com/tzioup/Bumper-Sticker-Generator). It composes supplied artwork; it does not generate images or slogans.

Bundled PDF libraries and their licenses are in `vendor/`. [dependency-manifest.json](dependency-manifest.json) pins their versions, download locations and SHA-256 checksums. No external CDN is used at runtime.
