import sys
import threading
from db import load_notes, save_notes

HAS_GTK = False
Gtk = None
WebKit2 = None

try:
    import gi
    gi.require_version('Gtk', '3.0')
    try:
        gi.require_version('WebKit2', '4.1')
    except (ValueError, AttributeError):
        gi.require_version('WebKit2', '4.0')
    from gi.repository import Gtk, WebKit2
    HAS_GTK = True
except Exception:
    HAS_GTK = False

class StickyNoteWindow(Gtk.Window if HAS_GTK else object):
    def __init__(self, note_id, port):
        if not HAS_GTK:
            return
        super().__init__(title="Sticky Note")
        self.note_id = note_id
        self.port = port
        self.set_default_size(320, 360)
        self.set_decorated(True)
        self.set_keep_above(True)

        self.webview = WebKit2.WebView()
        self.add(self.webview)

        notes = load_notes()
        note = next((n for n in notes if n["id"] == note_id), None)
        title = note["title"] if note else "Sticky Note"
        content = note["content"] if note else ""
        prio = note.get("priority", "medium") if note else "medium"

        bg_color = "#282c34"
        accent_color = "#61afef"
        if prio == "urgent":
            accent_color = "#c586c0"
        elif prio == "high":
            accent_color = "#e06c75"
        elif prio == "low":
            accent_color = "#98c379"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{
              background-color: {bg_color};
              color: #abb2bf;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 16px;
              display: flex;
              flex-direction: column;
              height: 100vh;
              box-sizing: border-box;
            }}
            .header {{
              font-weight: bold;
              font-size: 16px;
              color: #ffffff;
              border-bottom: 2px solid {accent_color};
              padding-bottom: 8px;
              margin-bottom: 12px;
              outline: none;
            }}
            .body {{
              flex: 1;
              font-size: 14px;
              line-height: 1.5;
              outline: none;
              white-space: pre-wrap;
              word-break: break-word;
            }}
            .footer {{
              font-size: 11px;
              color: #5c6370;
              margin-top: 8px;
              text-align: right;
            }}
          </style>
        </head>
        <body>
          <div class="header" contenteditable="true" id="title">{title}</div>
          <div class="body" contenteditable="true" id="content">{content}</div>
          <div class="footer">Auto-saved</div>
          <script>
            function sync() {{
              const t = document.getElementById('title').innerText;
              const c = document.getElementById('content').innerText;
              fetch('http://127.0.0.1:{port}/api/notes')
                .then(r => r.json())
                .then(notes => {{
                  const n = notes.find(x => x.id === '{note_id}');
                  if (n) {{
                    n.title = t;
                    n.content = c;
                    fetch('http://127.0.0.1:{port}/api/notes', {{
                      method: 'POST',
                      headers: {{'Content-Type': 'application/json'}},
                      body: JSON.stringify(notes)
                    }});
                  }}
                }});
            }}
            document.getElementById('title').addEventListener('input', sync);
            document.getElementById('content').addEventListener('input', sync);
          </script>
        </body>
        </html>
        """
        self.webview.load_html(html, f"http://127.0.0.1:{port}/")
        self.show_all()

def spawn_sticky_note(note_id, port):
    if not HAS_GTK:
        return
    def launch():
        win = StickyNoteWindow(note_id, port)
        win.connect("destroy", lambda w: None)
        win.show_all()
        Gtk.main()

    t = threading.Thread(target=launch, daemon=True)
    t.start()
