"""Run the badge composer and its saved library on this computer."""

import argparse
import base64
import errno
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import re
import shutil
import ssl
import sys
import tempfile
from threading import Lock, Timer
from urllib.parse import unquote, urlsplit, quote
from urllib.request import build_opener, HTTPRedirectHandler, HTTPSHandler, Request
from urllib.error import URLError
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8770)
parser.add_argument("--open", action="store_true")
parser.add_argument("--library", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent
library = (args.library or root / ".library").resolve()
library.mkdir(parents=True, exist_ok=True)
write_lock = Lock()
formats = {"image/png", "image/jpeg", "image/webp", "application/pdf"}


def checked_url(value):
    if not isinstance(value, str):
        raise ValueError("Use a direct image or PDF link.")
    parts = urlsplit(value)
    if parts.scheme not in {"http", "https"} or not parts.hostname or parts.username or parts.password:
        raise ValueError("Use an HTTP or HTTPS image or PDF link.")
    return value


class DesignRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return super().redirect_request(request, file, code, message, headers, checked_url(new_url))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *arguments, **kwargs):
        super().__init__(*arguments, directory=str(root), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/library":
            with write_lock:
                records = [json.loads(path.read_text()) for path in library.glob("*/record.json")]
            self.respond(200, sorted(records, key=lambda record: record["name"].casefold()))
            return
        match = re.fullmatch(r"/api/library/([a-f0-9]{64})/(source|preview)", self.path)
        if match:
            folder = library / match[1]
            try:
                with write_lock:
                    record = json.loads((folder / "record.json").read_text())
                    content = (folder / match[2]).read_bytes()
            except FileNotFoundError:
                self.respond(404, {"error": "Design not found."})
                return
            self.send_response(200)
            self.send_header("Content-Type", record["type"] if match[2] == "source" else "image/png")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        if self.path.startswith("/api/") or "/." in unquote(self.path):
            self.respond(404, {"error": "Not found."})
            return
        super().do_GET()

    def same_origin(self):
        return self.headers.get("Origin") == f"http://{self.headers.get('Host')}"

    def do_POST(self):
        if not self.same_origin():
            self.respond(403, {"error": "Open the composer on this computer."})
            return
        if self.path == "/api/import-url":
            self.import_url()
            return
        if self.path != "/api/library":
            self.respond(404, {"error": "Not found."})
            return
        mime = self.headers.get_content_type()
        name = unquote(self.headers.get("X-File-Name", "")).strip()
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if mime not in formats or not name or len(name) > 240 or not 0 < length <= 64 * 1024 * 1024:
            self.respond(400, {"error": "Choose a PDF or image up to 64 MB."})
            return
        content = self.rfile.read(length)
        if len(content) != length:
            self.respond(400, {"error": "The file transfer was incomplete."})
            return
        identifier = sha256(content).hexdigest()
        folder = library / identifier
        with write_lock:
            if folder.exists():
                record = json.loads((folder / "record.json").read_text())
            else:
                record = {"id": identifier, "name": name, "type": mime, "size": length}
                with tempfile.TemporaryDirectory(dir=library, prefix=".saving-") as temporary:
                    staged = Path(temporary) / identifier
                    staged.mkdir()
                    (staged / "source").write_bytes(content)
                    (staged / "record.json").write_text(json.dumps(record, ensure_ascii=False))
                    staged.rename(folder)
        self.respond(200, record)

    def import_url(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                raise ValueError("Use a direct image or PDF link.")
            url = checked_url(json.loads(self.rfile.read(length)).get("url"))
            request = Request(url, headers={"User-Agent": "BadgeSheetComposer/1.0"})
            system_ca = Path("/etc/ssl/cert.pem")
            context = ssl.create_default_context(cafile=str(system_ca) if sys.platform == "darwin" and system_ca.is_file() else None)
            with build_opener(DesignRedirects(), HTTPSHandler(context=context)).open(request, timeout=25) as response:
                content = response.read(64 * 1024 * 1024 + 1)
                filename = response.headers.get_filename() or unquote(Path(urlsplit(response.url).path).name)
            if not content or len(content) > 64 * 1024 * 1024:
                raise ValueError("Choose an image or PDF up to 64 MB.")
            if content.startswith(b"%PDF-"):
                mime, extension = "application/pdf", ".pdf"
            elif content.startswith(b"\x89PNG\r\n\x1a\n"):
                mime, extension = "image/png", ".png"
            elif content.startswith(b"\xff\xd8\xff"):
                mime, extension = "image/jpeg", ".jpg"
            elif content.startswith(b"RIFF") and content[8:12] == b"WEBP":
                mime, extension = "image/webp", ".webp"
            else:
                raise ValueError("Use a direct image or PDF link, rather than a webpage.")
            filename = Path(filename or "design").name
            if not filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".pdf")):
                filename += extension
        except (ValueError, OSError, URLError, AttributeError) as error:
            self.respond(400, {"error": str(error), "code": "url_import_failed"})
            return
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("X-File-Name", quote(filename[:240]))
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_PATCH(self):
        if not self.same_origin():
            self.respond(403, {"error": "Open the composer on this computer."})
            return
        match = re.fullmatch(r"/api/library/([a-f0-9]{64})", self.path)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not match or not 0 < length <= 1024 * 1024:
                raise ValueError
            payload = json.loads(self.rfile.read(length))
            sizes = payload.get("sizes")
            info = payload.get("info")
            framing = payload.get("framing")
            if sizes is not None and (not isinstance(sizes, list) or any(size not in ["25", "32", "58"] for size in sizes)):
                raise ValueError
            if info is not None and (not isinstance(info, dict) or not all(
                    isinstance(info.get(key), (int, float)) and info[key] > 0 for key in ["width", "height"])):
                raise ValueError
            if framing is not None:
                if not isinstance(framing, dict) or framing.get("size") not in ["25", "32", "58"]:
                    raise ValueError
                for key, low, high in [("zoom", 0, 2), ("x", -70, 70), ("y", -70, 70)]:
                    value = framing.get(key)
                    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
                        raise ValueError
                    if key == "zoom" and value == 0:
                        raise ValueError
            preview = payload.get("preview")
            if preview is not None:
                preview = base64.b64decode(preview, validate=True)
                if not preview.startswith(b"\x89PNG\r\n\x1a\n"):
                    raise ValueError
        except (ValueError, AttributeError):
            self.respond(400, {"error": "Choose an available badge size."})
            return
        with write_lock:
            path = library / match[1] / "record.json"
            if not path.is_file():
                self.respond(404, {"error": "Design not found."})
                return
            record = json.loads(path.read_text())
            if sizes is not None:
                record["sizes"] = sorted(set(sizes))
            if framing is not None:
                record.setdefault("framings", {})[framing["size"]] = {key: framing[key] for key in ["zoom", "x", "y"]}
            if info is not None:
                record["info"] = {key: info[key] for key in ["kind", "mime", "width", "height", "pdfQuality", "suggestedSizes"] if key in info}
            if preview is not None:
                preview_path = path.parent / "preview"
                staged_preview = path.parent / ".preview.tmp"
                staged_preview.write_bytes(preview)
                staged_preview.replace(preview_path)
            temporary = path.with_suffix(".tmp")
            temporary.write_text(json.dumps(record, ensure_ascii=False))
            temporary.replace(path)
        self.respond(200, record)

    def do_DELETE(self):
        if not self.same_origin():
            self.respond(403, {"error": "Open the composer on this computer."})
            return
        match = re.fullmatch(r"/api/library/([a-f0-9]{64})", self.path)
        if not match:
            self.respond(404, {"error": "Design not found."})
            return
        with write_lock:
            folder = library / match[1]
            if folder.exists():
                shutil.rmtree(folder)
        self.respond(200, {"removed": match[1]})


try:
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
except OSError as error:
    if args.open and error.errno == errno.EADDRINUSE:
        webbrowser.open(f"http://127.0.0.1:{args.port}/")
        raise SystemExit(0)
    raise
print(f"Badge sheet composer: http://127.0.0.1:{args.port}/", flush=True)
if args.open:
    Timer(0.5, lambda: webbrowser.open(f"http://127.0.0.1:{args.port}/")).start()
server.serve_forever()
