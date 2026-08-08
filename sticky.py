import os
import sys
import threading
from db import load_notes, save_notes, load_theme

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
    from gi.repository import Gtk, WebKit2, GLib
    HAS_GTK = True
except Exception:
    HAS_GTK = False

_active_sticky_windows = set()

class StickyNoteWindow(Gtk.Window if HAS_GTK else object):
    def __init__(self, note_id, port):
        if not HAS_GTK:
            return
        
        notes = load_notes()
        note = next((n for n in notes if n["id"] == note_id), None)
        title = note["title"] if note else "Sticky Note"

        super().__init__(title=f"📌 {title}")
        self.note_id = note_id
        self.port = port
        self.set_default_size(320, 360)
        self.set_decorated(True)
        self.set_keep_above(True)

        workspace_dir = os.path.dirname(os.path.abspath(__file__))
        icon_path = os.path.join(workspace_dir, "icon.png")
        if not os.path.exists(icon_path):
            icon_path = "/usr/share/pixmaps/kanban-notes-desktop.png"
        if os.path.exists(icon_path):
            try:
                self.set_icon_from_file(icon_path)
            except Exception as e:
                print(f"Sticky note icon load note: {e}")

        self.webview = WebKit2.WebView()
        self.add(self.webview)

        content = note["content"] if note else ""
        prio = note.get("priority", "medium") if note else "medium"
        current_theme = load_theme()

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
        <html data-theme="{current_theme}">
        <head>
          <meta charset="utf-8">
          <style>
            body {{
              background-color: {bg_color};
              color: #abb2bf;
              font-family: 'JetBrains Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace, sans-serif;
              margin: 0;
              padding: 16px;
              display: flex;
              flex-direction: column;
              height: 100vh;
              box-sizing: border-box;
              transition: background-color 0.3s ease, color 0.3s ease;
            }}
            .header {{
              font-weight: bold;
              font-size: 16px;
              color: #ffffff;
              border-bottom: 2px solid {accent_color};
              padding-bottom: 8px;
              margin-bottom: 12px;
              outline: none;
              transition: color 0.3s ease;
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
              transition: color 0.3s ease;
            }}
            /* Light Theme Styling */
            html[data-theme="light"] body {{
              background-color: #f8f9fa;
              color: #212529;
            }}
            html[data-theme="light"] .header {{
              color: #1a1a1a;
            }}
            html[data-theme="light"] .footer {{
              color: #6c757d;
            }}
          </style>
        </head>
        <body>
          <div class="header" contenteditable="true" id="title">{title}</div>
          <div class="body" contenteditable="true" id="content">{content}</div>
          <div class="footer">Auto-saved</div>
          <script>
            let debounceTimer = null;
            function onInput() {{
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(sync, 350);
            }}

            function sync() {{
              const t = document.getElementById('title').innerText;
              const c = document.getElementById('content').innerText;
              fetch('http://127.0.0.1:{port}/api/notes')
                .then(r => r.json())
                .then(notes => {{
                  const n = notes.find(x => x.id === '{note_id}');
                  if (n) {{
                    if (n.title !== t || n.content !== c) {{
                      n.title = t;
                      n.content = c;
                      fetch('http://127.0.0.1:{port}/api/notes', {{
                        method: 'POST',
                        headers: {{'Content-Type': 'application/json'}},
                        body: JSON.stringify(notes)
                      }});
                    }}
                  }}
                }});
            }}

            function pollBackend() {{
              fetch('http://127.0.0.1:{port}/api/theme')
                .then(r => r.json())
                .then(data => {{
                  if (data && data.theme) {{
                    document.documentElement.setAttribute('data-theme', data.theme);
                  }}
                }}).catch(() => {{}});

              if (document.activeElement && (document.activeElement.id === 'title' || document.activeElement.id === 'content')) {{
                return;
              }}
              fetch('http://127.0.0.1:{port}/api/notes')
                .then(r => r.json())
                .then(notes => {{
                  const n = notes.find(x => x.id === '{note_id}');
                  if (n) {{
                    const titleEl = document.getElementById('title');
                    const contentEl = document.getElementById('content');
                    if (titleEl && titleEl.innerText !== n.title) titleEl.innerText = n.title;
                    if (contentEl && contentEl.innerText !== (n.content || '')) contentEl.innerText = n.content || '';
                  }}
                }});
            }}

            document.getElementById('title').addEventListener('input', onInput);
            document.getElementById('content').addEventListener('input', onInput);
            setInterval(pollBackend, 1500);
          </script>
        </body>
        </html>
        """
        self.webview.load_html(html, f"http://127.0.0.1:{port}/")
        self.show_all()

def spawn_sticky_note(note_id, port):
    if not HAS_GTK or GLib is None:
        return

    def _create():
        try:
            win = StickyNoteWindow(note_id, port)
            _active_sticky_windows.add(win)
            win.connect("destroy", lambda w: _active_sticky_windows.discard(w))
            win.show_all()
        except Exception as e:
            print(f"Error spawning sticky note window: {e}")
        return False

    GLib.idle_add(_create)
