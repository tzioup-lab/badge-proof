"""Produce a static-only website with versioned, integrity-checked offline assets."""
import base64
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

root = Path(__file__).resolve().parent
destination = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "dist"
files = ["index.html", "composer.css", "composer.js", "library-store.js", "backup.js", "archive.js",
         "app-shell.js", "presets.js", "quality.js", "manifest.webmanifest"]
files += [str(path.relative_to(root)) for folder in ["vendor", "icons"] for path in sorted((root / folder).glob("*")) if path.is_file()]
version = json.loads((root / "package.json").read_text())["version"]
digest = hashlib.sha256()
for name in sorted(files):
    digest.update(name.encode())
    digest.update((root / name).read_bytes())
digest.update((root / "service-worker.js").read_bytes())
build = version + "-" + digest.hexdigest()[:12]
if destination.exists():
    # Only remove a previous output that this builder owns.
    if not (destination / ".badge-proof-build").is_file():
        raise SystemExit("Choose an empty output folder or a previous Badge Proof build.")
    shutil.rmtree(destination)
destination.mkdir(parents=True)
(destination / ".badge-proof-build").write_text(build)
for name in files:
    target = destination / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if name.endswith((".js", ".html", ".css")) and not name.startswith("vendor/"):
        text = (root / name).read_text().replace("__BUILD_ID__", build)
        if name.endswith(".js"):
            text = re.sub(r'''(["'])\./([^"']+\.(?:m?js|css))\1''',
                          lambda match: match[1] + "./" + match[2] + ("?v=" + build if match[2] in files else "") + match[1], text)
        if name == "index.html":
            text = re.sub(r'''(src|href)="([^"?]+)"''',
                          lambda match: match[1] + '="' + match[2] + ("?v=" + build if match[2].removeprefix("./") in files else "") + '"', text)
        target.write_text(text)
    else:
        shutil.copyfile(root / name, target)
assets = []
for name in files:
    integrity = "sha256-" + base64.b64encode(hashlib.sha256((destination / name).read_bytes()).digest()).decode()
    paths = [name] if name == "index.html" else [name + "?v=" + build]
    if name.startswith("icons/") or name == "manifest.webmanifest":
        paths.append(name)
    assets.extend({"path": path, "integrity": integrity} for path in paths)
worker = (root / "service-worker.js").read_text().replace("__BUILD_ID__", build).replace("__ASSET_PATHS__", json.dumps(assets))
(destination / "service-worker.js").write_text(worker)
(destination / ".nojekyll").touch()
print(f"Built {build}: {destination}")
