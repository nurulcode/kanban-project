#!/usr/bin/env python3
import sys
import os
import socket
import threading
import time
from http.server import HTTPServer

from db import init_db
from server import KanbanRequestHandler

HAS_GTK = False
Gtk = None
WebKit2 = None
Gio = None
GLib = None

try:
    import gi
    gi.require_version('Gtk', '3.0')
    try:
        gi.require_version('WebKit2', '4.1')
    except (ValueError, AttributeError):
        gi.require_version('WebKit2', '4.0')
    from gi.repository import Gtk, WebKit2, Gio, GLib
    HAS_GTK = True
except Exception:
    HAS_GTK = False

BaseWindow = Gtk.Window if (HAS_GTK and Gtk is not None) else object

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
GUI_DIR = os.path.join(WORKSPACE_DIR, "gui")

class KanbanAppWindow(BaseWindow):
    def __init__(self, port):
        if not HAS_GTK:
            return
        super().__init__(title="Kanban Notes Desktop")
        self.port = port
        self.set_default_size(1280, 800)

        # Set Icon
        icon_path = os.path.join(WORKSPACE_DIR, "icon.png")
        if not os.path.exists(icon_path):
            icon_path = "/usr/share/pixmaps/kanban-notes-desktop.png"
        if os.path.exists(icon_path):
            try:
                self.set_icon_from_file(icon_path)
            except Exception as e:
                print(f"Icon load note: {e}")

        # === AGGRESSIVE MEMORY OPTIMIZATION ===

        # 1. Create ephemeral (no-disk-cache) web context
        try:
            data_manager = WebKit2.WebsiteDataManager.new_ephemeral()
            web_context = WebKit2.WebContext.new_with_website_data_manager(data_manager)
        except Exception:
            web_context = WebKit2.WebContext.get_default()

        # 2. Set cache model to minimal (DOCUMENT_VIEWER = no back/forward cache)
        try:
            web_context.set_cache_model(WebKit2.CacheModel.DOCUMENT_VIEWER)
        except Exception:
            pass

        # 3. Disable spell checking (saves memory)
        try:
            web_context.set_spell_checking_enabled(False)
        except Exception:
            pass

        # 4. Limit web process count
        try:
            web_context.set_web_process_count_limit(1)
        except Exception:
            pass

        # 5. Create WebView with optimized context
        self.webview = WebKit2.WebView.new_with_context(web_context)

        # 6. Configure WebKit Settings for absolute minimum memory
        settings = self.webview.get_settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_write_console_messages_to_stdout(False)

        # Disable unused heavy features
        for attr in [
            'set_enable_webgl', 'set_enable_webaudio',
            'set_enable_media_stream', 'set_enable_mediasource',
            'set_enable_accelerated_2d_canvas', 'set_enable_media',
            'set_enable_plugins', 'set_enable_java',
            'set_enable_smooth_scrolling',
        ]:
            if hasattr(settings, attr):
                try:
                    getattr(settings, attr)(False)
                except Exception:
                    pass

        # 7. Disable hardware acceleration (biggest RAM saver ~50-80MB)
        if hasattr(WebKit2, 'HardwareAccelerationPolicy'):
            try:
                settings.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
            except Exception:
                pass

        self.add(self.webview)

        # Allow Notification Permission requests in WebKit GTK
        def on_permission_request(webview, request):
            if hasattr(WebKit2, 'NotificationPermissionRequest') and isinstance(request, WebKit2.NotificationPermissionRequest):
                request.allow()
                return True
            elif hasattr(request, 'allow'):
                request.allow()
                return True
            return False

        self.webview.connect("permission-request", on_permission_request)

        # Auto-retry on load failure (e.g. temporary socket delay)
        def on_load_failed(webview, load_event, failing_uri, error):
            print(f"⚠️ WebKit load failed for {failing_uri}: {error}. Retrying in 200ms...")
            GLib.timeout_add(200, lambda: (webview.load_uri(failing_uri), False)[1])
            return True

        self.webview.connect("load-failed", on_load_failed)

        # Load Web Application
        url = f"http://127.0.0.1:{port}/index.html"
        self.webview.load_uri(url)

        self.connect("destroy", Gtk.main_quit)

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

http_server = None

def start_backend_server(port):
    global http_server
    http_server = HTTPServer(('127.0.0.1', port), KanbanRequestHandler)
    http_server.serve_forever()

def wait_for_server(port, timeout=3.0):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                return True
        except (OSError, ConnectionRefusedError):
            time.sleep(0.05)
    return False

def main():
    init_db()

    port = find_free_port()
    t = threading.Thread(target=start_backend_server, args=(port,), daemon=True)
    t.start()
    
    # Wait until HTTP backend server is actively accepting connections
    if not wait_for_server(port):
        print(f"⚠️ Warning: Server on port {port} did not respond within timeout.")

    print(f"🚀 Kanban Notes Desktop Backend running on http://127.0.0.1:{port}")

    if HAS_GTK:
        app_win = KanbanAppWindow(port)
        if http_server:
            http_server.app_window = app_win
        app_win.show_all()
        Gtk.main()
    else:
        print("⚠️ GTK3 / WebKit2 not detected in environment. Running web server mode.")
        print(f"Buka browser Anda di: http://127.0.0.1:{port}")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nServer dihentikan.")

if __name__ == "__main__":
    main()
