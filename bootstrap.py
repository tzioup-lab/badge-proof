"""Check the local composer dependencies, repair browser files, then start."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
from urllib.error import URLError
from urllib.request import Request, urlopen


def matches(path, expected):
    return path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == expected


def download(url):
    if sys.platform == "darwin":
        # Python.org's macOS installer may not yet have its optional CA bundle.
        # The system curl uses the Mac's existing trust store.
        result = subprocess.run(
            ["/usr/bin/curl", "--fail", "--location", "--proto", "=https", "--tlsv1.2",
             "--connect-timeout", "20", "--max-time", "120", "--silent", "--show-error", url],
            capture_output=True, check=True, timeout=125,
        )
        return result.stdout
    request = Request(url, headers={"User-Agent": "BadgeSheetComposer/1"})
    with urlopen(request, timeout=60) as response:
        return response.read()


def check_dependencies(root, *, offline=False, dry_run=False, fetch=download):
    manifest = json.loads((root / "dependency-manifest.json").read_text(encoding="utf-8"))
    if sys.version_info < tuple(manifest["minimum_python"]):
        raise RuntimeError("Python 3.10+ requis / Python 3.10+ required.")
    for package in manifest["browser_packages"]:
        missing = [item for item in package["files"] if not matches(root / item["path"], item["sha256"])]
        if not missing:
            continue
        names = ", ".join(item["path"] for item in missing)
        if dry_run:
            print(f"À restaurer / Would restore {package['name']} {package['version']}: {names}", flush=True)
            continue
        if offline:
            raise RuntimeError(
                f"Fichiers manquants ou modifiés / Missing or changed files: {names}.\n"
                "Reconnectez Internet puis relancez, ou recopiez le dossier vendor depuis le ZIP complet.\n"
                "Reconnect and reopen, or restore the vendor folder from the complete ZIP."
            )
        print(f"Restauration / Restoring {package['name']} {package['version']}…", flush=True)
        archive_bytes = fetch(package["url"])
        if hashlib.sha256(archive_bytes).hexdigest() != package["sha256"]:
            raise RuntimeError(f"Téléchargement non conforme / Download checksum mismatch: {package['name']}")
        staged = []
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
            for item in missing:
                member = archive.getmember(item["member"])
                if not member.isfile():
                    raise RuntimeError("Archive inattendue / Unexpected dependency archive.")
                blob = archive.extractfile(member).read()
                if hashlib.sha256(blob).hexdigest() != item["sha256"]:
                    raise RuntimeError(f"Fichier non conforme / File checksum mismatch: {item['path']}")
                target = (root / item["path"]).resolve()
                if root.resolve() not in target.parents:
                    raise RuntimeError("Chemin de dépendance invalide / Invalid dependency path.")
                staged.append((target, blob))
        for target, blob in staged:
            target.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=target.parent, delete=False, prefix=".restore-") as temporary:
                temporary.write(blob)
                temporary_path = Path(temporary.name)
            try:
                temporary_path.replace(target)
            finally:
                temporary_path.unlink(missing_ok=True)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify/repair without starting the server.")
    parser.add_argument("--offline", action="store_true", help="Check existing files without downloads.")
    parser.add_argument("--dry-run", action="store_true", help="Report required repairs without changing files.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent, help=argparse.SUPPRESS)
    parser.add_argument("--port", type=int, default=8770)
    parser.add_argument("--open", action="store_true")
    arguments = parser.parse_args()
    root = arguments.root.resolve()
    try:
        check_dependencies(root, offline=arguments.offline, dry_run=arguments.dry_run)
    except (OSError, URLError, RuntimeError, ValueError, KeyError, tarfile.TarError,
            subprocess.SubprocessError) as error:
        print(f"Le composeur ne peut pas démarrer / Composer could not start.\n{error}", file=sys.stderr)
        print(
            "Vérifiez la connexion et réessayez. Hors ligne, restaurez vendor depuis le ZIP complet.\n"
            "Check your connection and retry. Offline, restore vendor from the complete ZIP.",
            file=sys.stderr,
        )
        return 1
    print(f"Prêt / Ready. Python {sys.version_info.major}.{sys.version_info.minor}; bibliothèques vérifiées / libraries verified.", flush=True)
    if arguments.check or arguments.dry_run:
        return 0
    command = [sys.executable, str(root / "serve.py"), "--port", str(arguments.port)]
    if arguments.open:
        command.append("--open")
    os.execv(sys.executable, command)


if __name__ == "__main__":
    raise SystemExit(main())
