"""Exercise startup repair in temporary folders, without installing Python."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("composer_bootstrap", HERE / "bootstrap.py")
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
manifest = json.loads((HERE / "dependency-manifest.json").read_text())

with tempfile.TemporaryDirectory(prefix="bootstrap-check-") as directory:
    root = Path(directory)
    shutil.copyfile(HERE / "dependency-manifest.json", root / "dependency-manifest.json")
    shutil.copytree(HERE / "vendor", root / "vendor")
    broken = root / "vendor/pdf.worker.mjs"
    broken.write_bytes(b"broken fixture")
    (root / "vendor/pdf-lib-LICENSE.md").unlink()
    try:
        bootstrap.check_dependencies(root, offline=True)
        raise AssertionError("An incomplete offline bundle must be rejected.")
    except RuntimeError as error:
        assert "Missing or changed" in str(error)
    bootstrap.check_dependencies(root, dry_run=True)
    assert broken.read_bytes() == b"broken fixture"
    bootstrap.check_dependencies(root)
    bootstrap.check_dependencies(root, offline=True, fetch=lambda _: (_ for _ in ()).throw(AssertionError("Unexpected download")))
    assert bootstrap.matches(broken, manifest["browser_packages"][1]["files"][1]["sha256"])
    broken.write_bytes(b"broken fixture")
    try:
        bootstrap.check_dependencies(root, fetch=lambda _: b"bad archive")
        raise AssertionError("A download with the wrong checksum must be rejected.")
    except RuntimeError as error:
        assert "checksum mismatch" in str(error)
    assert broken.read_bytes() == b"broken fixture"
    print("PASS: missing/corrupt dependency detection, offline failure, dry run, official package repair, reuse, bad download rejection.")

    if sys.platform == "darwin":
        launcher = (HERE / "Ouvrir-le-composeur.command").read_text()
        launcher = re.sub(r"find_python\(\) \{.*?\n\}", """find_python() {
  if [[ -f "$root/mock-installed" ]]; then
    print -r -- PYTHON_EXECUTABLE
    return 0
  fi
  return 1
}""".replace("PYTHON_EXECUTABLE", "'" + sys.executable.replace("'", "'\\''") + "'"), launcher, count=1, flags=re.S)
        test_launcher = root / "launch.command"
        test_launcher.write_text(launcher)
        result = subprocess.run(["/bin/zsh", str(test_launcher), "--dry-run"], capture_output=True, text=True, timeout=10)
        assert result.returncode == 0, result.stdout + result.stderr
        assert "would download" in result.stdout and "Python Software Foundation signature" in result.stdout
        assert not (root / ".runtime").exists()

        fixture = b"mock installer bytes"
        test_manifest = dict(manifest)
        test_manifest["python"] = {**manifest["python"], "macos": {
            **manifest["python"]["macos"], "sha256": hashlib.sha256(fixture).hexdigest()}}
        (root / "dependency-manifest.json").write_text(json.dumps(test_manifest))
        mock_curl = root / "mock-curl"
        mock_curl.write_text(
            '#!/bin/zsh\nwhile (( $# )); do\n'
            'if [[ "$1" == --output ]]; then print -rn -- "mock installer bytes" > "$2"; exit 0; fi\n'
            'shift\ndone\nexit 1\n'
        )
        mock_signature = root / "mock-signature"
        mock_signature.write_text('#!/bin/zsh\nprint "Python Software Foundation (BMM5U3QVKW)"\n')
        mock_open = root / "mock-open"
        mock_open.write_text('#!/bin/zsh\ntouch "' + str(root / "mock-installed") + '"\n')
        for mock in (mock_curl, mock_signature, mock_open):
            mock.chmod(0o755)
        launcher = launcher.replace("/usr/bin/curl", f'"{mock_curl}"')
        launcher = launcher.replace("/usr/sbin/pkgutil", f'"{mock_signature}"')
        launcher = launcher.replace("/usr/bin/open", f'"{mock_open}"')
        test_launcher.write_text(launcher)
        (root / "bootstrap.py").write_text(
            'from pathlib import Path\nPath(__file__).with_name("mock-bootstrap-ran").write_text("ok")\n'
        )
        result = subprocess.run(["/bin/zsh", str(test_launcher)], input="\n", capture_output=True, text=True, timeout=15)
        assert result.returncode == 0, result.stdout + result.stderr
        assert (root / "mock-bootstrap-ran").exists()
        assert (root / ".runtime/python-installer.pkg").read_bytes() == fixture
        print("PASS: missing-Python Mac dry run and mocked Installer/verification/re-detection/bootstrap sequence.")

print("No Python installation was performed. Existing vendor and runtime folders were preserved.")
