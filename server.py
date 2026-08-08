import os
import json
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler
from db import (
    load_notes, save_notes,
    load_columns, save_columns,
    load_workspaces, save_workspaces,
    load_pomo_stats, save_pomo_stats,
    load_theme, save_theme,
    generate_markdown_export
)
from autostart import get_autostart_status, set_autostart_status
from sticky import spawn_sticky_note

GUI_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gui")

class KanbanRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=GUI_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/notes":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            notes = load_notes()
            self.wfile.write(json.dumps(notes).encode("utf-8"))
        elif self.path == "/api/columns":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            cols = load_columns()
            self.wfile.write(json.dumps(cols).encode("utf-8"))
        elif self.path == "/api/workspaces":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            ws_list = load_workspaces()
            self.wfile.write(json.dumps(ws_list).encode("utf-8"))
        elif self.path == "/api/export":
            md_content = generate_markdown_export()
            downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
            if not os.path.exists(downloads_dir):
                os.makedirs(downloads_dir, exist_ok=True)
            filepath = os.path.join(downloads_dir, "kanban_notes_export.md")
            try:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(md_content)
            except Exception:
                filepath = os.path.join(os.getcwd(), "kanban_notes_export.md")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(md_content)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "path": filepath}).encode("utf-8"))
        elif self.path == "/api/autostart":
            status = get_autostart_status()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"enabled": status}).encode("utf-8"))
        elif self.path == "/api/pomo_stats":
            stats = load_pomo_stats()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode("utf-8"))
        elif self.path == "/api/theme":
            theme = load_theme()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"theme": theme}).encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/notes":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode("utf-8"))
                success = save_notes(data)
                self.send_response(200 if success else 500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": success}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/columns":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                cols = json.loads(post_data.decode("utf-8"))
                success = save_columns(cols)
                self.send_response(200 if success else 500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": success}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/workspaces":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                ws_list = json.loads(post_data.decode("utf-8"))
                success = save_workspaces(ws_list)
                self.send_response(200 if success else 500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": success}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/popout":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode("utf-8"))
                note_id = payload.get("id")
                port = getattr(self.server, 'server_port', 8000)
                if note_id:
                    spawn_sticky_note(note_id, port)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/autostart":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode("utf-8"))
                enable = payload.get("enable", False)
                success = set_autostart_status(enable)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": success, "enabled": enable}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/pomo_stats":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode("utf-8"))
                success = save_pomo_stats(data)
                self.send_response(200 if success else 500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": success}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/theme":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode("utf-8"))
                theme_name = data.get("theme", "dark")
                success = save_theme(theme_name)
                self.send_response(200 if success else 500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": success, "theme": theme_name}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        elif self.path == "/api/play_sound":
            # Play native Linux system alert sound
            try:
                played = False
                for cmd in [
                    ["paplay", "/usr/share/sounds/freedesktop/stereo/complete.oga"],
                    ["canberra-gtk-play", "-i", "complete"],
                    ["aplay", "/usr/share/sounds/alsa/Front_Center.wav"]
                ]:
                    try:
                        subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        played = True
                        break
                    except FileNotFoundError:
                        continue

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": played}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()
