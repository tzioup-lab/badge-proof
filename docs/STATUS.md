# Status and next steps

Last reconciled: 2026-11-22. Start here when resuming maintenance.

## Shipped

**[Badge Proof v0.2.0](https://tzioup-lab.github.io/badge-proof/)** is live on free GitHub Pages. [Implementation PR #3](https://github.com/tzioup-lab/badge-proof/pull/3) is merged and [delivery issue #1](https://github.com/tzioup-lab/badge-proof/issues/1) is closed.

The app imports supplied artwork, saves a local library and per-size framing, composes quantities across A4 pages, and exports clean/guided PDFs or prepares direct printing. It supports 25, 32 and 58 mm presets and French/English. It does not generate artwork or slogans; that remains a separate project.

Offline preparation, portable backups and deferred app updates are implemented. The optional disk-backed local launcher remains available. Private originals and backups are excluded from the repository and published site.

## Accepted decisions

| Topic | Current decision |
| --- | --- |
| Distribution | Free installable browser app; no paid Apple membership, signing or required hosting subscription. |
| Designs | Local to each browser/profile or installed-app storage context; no account, cloud library or automatic cross-device sync. |
| Transfer | Explicit `.badgeproof` export/import, including originals, framing, size tags, sheet layouts, quantities and language. Import updates matching designs, retains unrelated designs and replaces sheet settings. |
| Existing local tool | Preserve its `.library`; export through its updated Help and backups UI. No silent cross-origin migration. |
| App updates | Check automatically; a complete new version waits for the user's reload. Preserve libraries and other windows' work. |
| URL import | Direct browser access when the source permits it; otherwise download/import a file. No public proxy. |
| Printing | Preserve physical geometry. Show A4 / margins None / Custom 100% guidance; the app cannot enforce driver settings. |

Changing browser/profile or using Safari's separate Dock app can open a different library. Install first, then import a backup. Clearing site data can delete its library; persistent-storage requests do not replace backups. See [the README](../README.md#your-library-and-backups).

## Next work, in order

1. **[Manual acceptance #2](https://github.com/tzioup-lab/badge-proof/issues/2):** Safari Add to Dock on Mac, Chrome/Edge installation on Windows, a subsequent deployed update on each, and physical print/press measurements. Record actual device/browser and measured results. Green engine tests do not complete these runs.
2. **Local-library move, if wanted:** the session exported and hash-checked the existing disk library. Import into the chosen browser/app has not been confirmed. The source remains available; do not assume migration has occurred or overwrite a current sheet without reviewing the import prompt.
3. Address concrete findings from those runs before expanding scope. Keep the optional local launcher as a fallback.

## Questions and candidates, not committed scope

There is no unanswered product decision blocking v0.2.0. The user asked how libraries work; the explanation was local libraries with manual backup/transfer, not a request to add cloud sync.

- If automatic cross-device access becomes a requirement, decide privacy, accounts, hosting cost and conflict behavior before proposing sync. Do not quietly introduce uploads.
- Selective design transfer or separate library/settings restore could make repeated transfers easier. Currently restore replaces sheet settings; no selective mode is implemented or promised.
- Optional local-launcher installation on clean Mac/Windows systems remains unverified. It is not a requirement for using the browser app and has no scheduled expansion.

## Maintenance and evidence

- [Verification](VERIFICATION.md) records test scope and live-release evidence; [distribution decision](BROWSER-DISTRIBUTION.md) explains storage, backup and update behavior.
- Use a feature branch/PR. Run checks relevant to the change; the GitHub Checks workflow runs Chromium, Firefox and WebKit with synthetic artwork. Never publish real designs, backups or `.library` data as evidence.
- Successful main-branch Checks trigger Pages publication of the exact checked commit. Verify deployment and live app before calling an application release shipped. For a user-visible application release, update `package.json` and the matching package-lock root version; the static builder adds its content hash.
- Documentation-only changes do not require an app-version bump. Repository docs are excluded from the static app build.
- No dependency or build work remains pending from this session. No repository credentials or machine-specific setup is required by end users.
