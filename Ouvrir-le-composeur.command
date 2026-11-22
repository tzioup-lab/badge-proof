#!/bin/zsh
set -u
cd -- "$(dirname -- "$0")"
root="$PWD"

find_python() {
  local candidate
  local -a candidates
  candidates=()
  for candidate in python3 python; do
    if (( $+commands[$candidate] )); then candidates+=("${commands[$candidate]}"); fi
  done
  candidates+=(
    /Library/Frameworks/Python.framework/Versions/[0-9]*/bin/python3(N)
    /opt/homebrew/bin/python3
    /usr/local/bin/python3
  )
  for candidate in "${candidates[@]}"; do
    [[ -x "$candidate" ]] || continue
    if [[ "$candidate" == /usr/bin/python3 ]] && ! /usr/bin/xcode-select -p >/dev/null 2>&1; then continue; fi
    if "$candidate" -c 'import sys,http.server,ssl,tarfile,hashlib;sys.exit(sys.version_info<(3,10))' >/dev/null 2>&1; then
      print -r -- "$candidate"
      return 0
    fi
  done
  return 1
}

python_path="$(find_python)" || python_path=""
if [[ -n "$python_path" ]]; then
  "$python_path" bootstrap.py --port 8770 --open "$@"
  result=$?
else
  print "Python 3.10+ absent. Téléchargement du programme officiel Python."
  print "Python 3.10+ is missing. Downloading the official Python installer."
  manifest="$root/dependency-manifest.json"
  url="$(/usr/bin/plutil -extract python.macos.url raw -o - "$manifest")" || exit 1
  expected="$(/usr/bin/plutil -extract python.macos.sha256 raw -o - "$manifest")" || exit 1
  if [[ "${1:-}" == "--dry-run" ]]; then
    print "Simulation / Dry run: would download $url, verify SHA-256 and Python Software Foundation signature, open Installer, then retry Python detection."
    exit 0
  fi
  mkdir -p "$root/.runtime"
  package="$root/.runtime/python-installer.pkg"
  if ! /usr/bin/curl --fail --location --proto '=https' --tlsv1.2 --connect-timeout 20 --max-time 600 "$url" --output "$package.part"; then
    print "Téléchargement impossible. Reconnectez Internet, ou installez Python depuis https://www.python.org/downloads/macos/ puis relancez."
    print "Download failed. Reconnect, or install Python from https://www.python.org/downloads/macos/ and reopen."
    exit 1
  fi
  actual="$(/usr/bin/shasum -a 256 "$package.part")"
  actual="${actual%% *}"
  if [[ "$actual" != "$expected" ]]; then
    print "Téléchargement non conforme / Installer checksum mismatch."
    exit 1
  fi
  signature="$(/usr/sbin/pkgutil --check-signature "$package.part" 2>&1)"
  if [[ $? -ne 0 || "$signature" != *"Python Software Foundation"* || "$signature" != *"BMM5U3QVKW"* ]]; then
    print "Signature Python non confirmée / Python installer signature could not be verified."
    exit 1
  fi
  mv -f "$package.part" "$package"
  print "Terminez l'installation dans Installer, puis revenez ici."
  print "Complete installation in Installer, then return here."
  /usr/bin/open -W "$package" || exit 1
  print "Quand l'installation est terminée, appuyez sur Entrée."
  print "When installation is complete, press Return."
  read -r ignored
  python_path="$(find_python)" || python_path=""
  if [[ -z "$python_path" ]]; then
    print "Python reste introuvable. Terminez l'installation puis relancez ce fichier."
    print "Python is still unavailable. Finish installation and reopen this file."
    exit 1
  fi
  "$python_path" bootstrap.py --port 8770 --open "$@"
  result=$?
fi
if (( result != 0 )); then
  print "Appuyez sur Entrée pour fermer / Press Return to close."
  read -r ignored
fi
exit "$result"
