#!/usr/bin/env python3
"""Serveur local Relève avec les en-têtes CSP / caméra de nginx."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "releve" / "public"
PORT = 8081

CSP = (
    "default-src 'self'; style-src 'self'; font-src 'self'; "
    "img-src 'self' data: blob:; media-src 'self' blob:; "
    "script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; "
    "connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"
)

TYPES = {
    ".mjs": "text/javascript; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".wasm": "application/wasm",
    ".gz": "application/gzip",
    ".pdf": "application/pdf",
    ".woff2": "font/woff2",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def guess_type(self, path):
        for ext, mime in TYPES.items():
            if str(path).endswith(ext):
                return mime
        return super().guess_type(path)


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"http://127.0.0.1:{PORT}/", flush=True)
    httpd.serve_forever()
