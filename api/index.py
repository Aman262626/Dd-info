import os
import json
import zipfile
import shutil
import tempfile
from http.server import BaseHTTPRequestHandler

WEBSITES_DIR = "/tmp/websites"


def parse_multipart(body, content_type):
    boundary = content_type.split("boundary=")[-1].encode()
    parts = body.split(b"--" + boundary)
    fields = {}
    files = {}

    for part in parts:
        if b"Content-Disposition" not in part:
            continue
        header, _, data = part.partition(b"\r\n\r\n")
        data = data.rstrip(b"\r\n--")
        header_str = header.decode("utf-8", errors="ignore")

        name = None
        filename = None
        for item in header_str.split(";"):
            item = item.strip()
            if item.startswith("name="):
                name = item.split("=")[1].strip('"')
            if item.startswith("filename="):
                filename = item.split("=")[1].strip('"')

        if filename:
            files[name] = {"filename": filename, "data": data}
        elif name:
            fields[name] = data.decode("utf-8", errors="ignore").strip()

    return fields, files


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.strip("/")

        # API: List sites
        if path == "api/sites":
            sites = []
            if os.path.exists(WEBSITES_DIR):
                domain = os.environ.get("VERCEL_URL", os.environ.get("DOMAIN", ""))
                if domain and not domain.startswith("http"):
                    domain = "https://" + domain
                for name in os.listdir(WEBSITES_DIR):
                    folder = os.path.join(WEBSITES_DIR, name)
                    if os.path.isdir(folder):
                        html_files = [f for f in os.listdir(folder) if f.endswith(".html")]
                        sites.append({
                            "name": name,
                            "url": f"{domain}/{name}/",
                            "hasHTML": len(html_files) > 0
                        })
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"sites": sites}).encode())
            return

        # Serve hosted site
        parts = path.split("/", 1)
        if len(parts) >= 1 and parts[0]:
            site = parts[0]
            file_path = parts[1] if len(parts) > 1 else ""
            folder = os.path.join(WEBSITES_DIR, site)

            if os.path.exists(folder):
                if file_path:
                    full_path = os.path.join(folder, file_path)
                    if os.path.isfile(full_path):
                        self._serve_file(full_path)
                        return
                else:
                    for f in os.listdir(folder):
                        if f.endswith(".html"):
                            self._serve_file(os.path.join(folder, f))
                            return

        self.send_response(404)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h1>Dd-info WebHost</h1><p>Site not found. Upload a clone ZIP via the extension.</p>")

    def do_POST(self):
        path = self.path.strip("/")

        if path == "api/upload":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            content_type = self.headers.get("Content-Type", "")

            if "multipart/form-data" not in content_type:
                self._json_response(400, {"error": "Expected multipart/form-data"})
                return

            fields, files = parse_multipart(body, content_type)

            if "file" not in files:
                self._json_response(400, {"error": "No file uploaded"})
                return

            file_info = files["file"]
            if not file_info["filename"].endswith(".zip"):
                self._json_response(400, {"error": "Only ZIP files allowed"})
                return

            site_name = fields.get("name", "")
            if not site_name:
                site_name = file_info["filename"].replace(".zip", "").replace("_working_clone", "").replace("_complete_clone", "")

            # Sanitize name
            site_name = "".join(c for c in site_name if c.isalnum() or c in "-_.")

            os.makedirs(WEBSITES_DIR, exist_ok=True)
            base_folder = os.path.join(WEBSITES_DIR, site_name)
            os.makedirs(base_folder, exist_ok=True)

            zip_path = os.path.join(base_folder, "site.zip")
            with open(zip_path, "wb") as f:
                f.write(file_info["data"])

            try:
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(base_folder)
            except Exception as e:
                self._json_response(500, {"error": f"ZIP extraction failed: {str(e)}"})
                return

            os.remove(zip_path)

            # Fix nested folder
            while True:
                items = os.listdir(base_folder)
                if len(items) == 1 and os.path.isdir(os.path.join(base_folder, items[0])):
                    inner = os.path.join(base_folder, items[0])
                    for f in os.listdir(inner):
                        os.rename(os.path.join(inner, f), os.path.join(base_folder, f))
                    os.rmdir(inner)
                else:
                    break

            domain = os.environ.get("VERCEL_URL", os.environ.get("DOMAIN", ""))
            if domain and not domain.startswith("http"):
                domain = "https://" + domain
            link = f"{domain}/{site_name}/"

            self._json_response(200, {"success": True, "name": site_name, "url": link})
            return

        self._json_response(404, {"error": "Not found"})

    def do_DELETE(self):
        path = self.path.strip("/")

        if path.startswith("api/delete/"):
            site = path.replace("api/delete/", "")
            site = "".join(c for c in site if c.isalnum() or c in "-_.")
            folder = os.path.join(WEBSITES_DIR, site)
            if os.path.exists(folder):
                shutil.rmtree(folder)
                self._json_response(200, {"success": True, "message": f"{site} deleted"})
            else:
                self._json_response(404, {"error": "Site not found"})
            return

        self._json_response(404, {"error": "Not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _serve_file(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        mime_types = {
            ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
            ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
            ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
            ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
            ".webp": "image/webp", ".avif": "image/avif", ".mp4": "video/mp4",
            ".webm": "video/webm", ".pdf": "application/pdf",
        }
        content_type = mime_types.get(ext, "application/octet-stream")

        with open(file_path, "rb") as f:
            data = f.read()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def _json_response(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
