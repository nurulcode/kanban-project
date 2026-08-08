import os
import json
import sqlite3
from datetime import datetime

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(WORKSPACE_DIR, "kanban_notes.db")
JSON_FILE = os.path.join(WORKSPACE_DIR, "kanban_notes.json")

# Default initial notes data
DEFAULT_DATA = [
    {
        "id": "note-1",
        "title": "Selamat Datang di Kanban Notes Desktop! 🚀",
        "content": "Aplikasi desktop ringan dengan penyimpanan database SQLite lokal & sistem Ruang Kerja.",
        "column": "todo",
        "priority": "medium",
        "tag": "Pengenalan",
        "createdAt": "2026-08-08 16:00"
    },
    {
        "id": "note-2",
        "title": "Integrasi Database SQLite & Ruang Kerja",
        "content": "Semua catatan, kolom, dan ruang kerja tersimpan secara persisten di kanban_notes.db.",
        "column": "in_progress",
        "priority": "high",
        "tag": "Backend",
        "createdAt": "2026-08-08 16:05"
    },
    {
        "id": "note-3",
        "title": "Tampilan Tema Modern",
        "content": "Warna khas VS Code One Dark Pro dengan kontrol yang intuitif.",
        "column": "done",
        "priority": "low",
        "tag": "Desain",
        "createdAt": "2026-08-08 15:50"
    }
]

DEFAULT_WORKSPACES = [
    {"id": "ws-default", "title": "Ruang Kerja", "color": "#61afef", "position": 1}
]

DEFAULT_COLUMNS = [
    {"id": "todo", "workspace_id": "ws-default", "title": "To Do", "color": "#569cd6", "position": 1},
    {"id": "in_progress", "workspace_id": "ws-default", "title": "In Progress", "color": "#dcdcaa", "position": 2},
    {"id": "review", "workspace_id": "ws-default", "title": "Review", "color": "#c586c0", "position": 3},
    {"id": "done", "workspace_id": "ws-default", "title": "Done", "color": "#4ec9b0", "position": 4}
]

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            color TEXT,
            position INTEGER
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            workspace_id TEXT DEFAULT 'ws-default',
            title TEXT NOT NULL,
            content TEXT,
            col TEXT NOT NULL,
            priority TEXT,
            tag TEXT,
            createdAt TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS columns (
            id TEXT PRIMARY KEY,
            workspace_id TEXT DEFAULT 'ws-default',
            title TEXT NOT NULL,
            color TEXT,
            position INTEGER
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pomo_stats (
            key TEXT PRIMARY KEY,
            val INTEGER
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pomo_history (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            durationMinutes INTEGER,
            completedAt TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            val TEXT
        )
    """)
    conn.commit()

    # Migration check for workspace_id column in notes
    cursor.execute("PRAGMA table_info(notes)")
    note_cols = [col[1] for col in cursor.fetchall()]
    if "workspace_id" not in note_cols:
        cursor.execute("ALTER TABLE notes ADD COLUMN workspace_id TEXT DEFAULT 'ws-default'")
        conn.commit()

    # Migration check for workspace_id column in columns
    cursor.execute("PRAGMA table_info(columns)")
    column_cols = [col[1] for col in cursor.fetchall()]
    if "workspace_id" not in column_cols:
        cursor.execute("ALTER TABLE columns ADD COLUMN workspace_id TEXT DEFAULT 'ws-default'")
        conn.commit()

    # Check workspaces
    cursor.execute("SELECT COUNT(*) FROM workspaces")
    if cursor.fetchone()[0] == 0:
        for ws in DEFAULT_WORKSPACES:
            cursor.execute("INSERT INTO workspaces (id, title, color, position) VALUES (?, ?, ?, ?)",
                           (ws["id"], ws["title"], ws["color"], ws["position"]))
        conn.commit()

    # Check columns
    cursor.execute("SELECT COUNT(*) FROM columns")
    if cursor.fetchone()[0] == 0:
        for col in DEFAULT_COLUMNS:
            cursor.execute("INSERT INTO columns (id, workspace_id, title, color, position) VALUES (?, ?, ?, ?, ?)",
                           (col["id"], col.get("workspace_id", "ws-default"), col["title"], col["color"], col["position"]))
        conn.commit()

    # Check if DB is empty
    cursor.execute("SELECT COUNT(*) FROM notes")
    count = cursor.fetchone()[0]

    if count == 0:
        initial_data = DEFAULT_DATA
        if os.path.exists(JSON_FILE):
            try:
                with open(JSON_FILE, "r", encoding="utf-8") as f:
                    json_notes = json.load(f)
                    if json_notes:
                        initial_data = json_notes
            except Exception as e:
                print(f"Error migrating JSON: {e}")

        for note in initial_data:
            cursor.execute("""
                INSERT OR REPLACE INTO notes (id, workspace_id, title, content, col, priority, tag, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                note.get("id"),
                note.get("workspace_id", "ws-default"),
                note.get("title", ""),
                note.get("content", ""),
                note.get("column", "todo"),
                note.get("priority", "medium"),
                note.get("tag", "Umum"),
                note.get("createdAt", "")
            ))
        conn.commit()

    conn.close()

def load_workspaces():
    init_db()
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, color, position FROM workspaces ORDER BY position ASC")
        rows = cursor.fetchall()
        conn.close()

        ws_list = []
        for r in rows:
            ws_list.append({"id": r[0], "title": r[1], "color": r[2] or "#61afef", "position": r[3]})
        return ws_list if ws_list else DEFAULT_WORKSPACES
    except Exception as e:
        print(f"Error loading workspaces: {e}")
        return DEFAULT_WORKSPACES

def save_workspaces(ws_list):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM workspaces")
        for i, ws in enumerate(ws_list):
            cursor.execute("INSERT INTO workspaces (id, title, color, position) VALUES (?, ?, ?, ?)",
                           (ws.get("id"), ws.get("title"), ws.get("color", "#61afef"), i + 1))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving workspaces: {e}")
        return False

def load_columns():
    init_db()
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, workspace_id, title, color, position FROM columns ORDER BY position ASC")
        rows = cursor.fetchall()
        conn.close()

        cols = []
        for r in rows:
            cols.append({
                "id": r[0],
                "workspace_id": r[1] or "ws-default",
                "title": r[2],
                "color": r[3] or "#007acc",
                "position": r[4]
            })
        return cols if cols else DEFAULT_COLUMNS
    except Exception as e:
        print(f"Error loading columns: {e}")
        return DEFAULT_COLUMNS

def save_columns(cols):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM columns")
        for i, col in enumerate(cols):
            cursor.execute("INSERT INTO columns (id, workspace_id, title, color, position) VALUES (?, ?, ?, ?, ?)",
                           (col.get("id"), col.get("workspace_id", "ws-default"), col.get("title"), col.get("color", "#007acc"), i + 1))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving columns: {e}")
        return False

def load_notes():
    init_db()
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, workspace_id, title, content, col, priority, tag, createdAt FROM notes")
        rows = cursor.fetchall()
        conn.close()

        notes = []
        for row in rows:
            notes.append({
                "id": row[0],
                "workspace_id": row[1] or "ws-default",
                "title": row[2],
                "content": row[3],
                "column": row[4],
                "priority": row[5],
                "tag": row[6],
                "createdAt": row[7]
            })
        return notes
    except Exception as e:
        print(f"Error loading notes from SQLite: {e}")
        return DEFAULT_DATA

def save_notes(data):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM notes")
        for note in data:
            cursor.execute("""
                INSERT INTO notes (id, workspace_id, title, content, col, priority, tag, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                note.get("id"),
                note.get("workspace_id", "ws-default"),
                note.get("title", ""),
                note.get("content", ""),
                note.get("column", "todo"),
                note.get("priority", "medium"),
                note.get("tag", "Umum"),
                note.get("createdAt", "")
            ))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving notes to SQLite: {e}")
        return False

def load_pomo_stats():
    init_db()
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT key, val FROM pomo_stats")
        rows = dict(cursor.fetchall())
        
        cursor.execute("SELECT id, type, durationMinutes, completedAt FROM pomo_history ORDER BY rowid DESC LIMIT 50")
        history_rows = cursor.fetchall()
        conn.close()

        history = []
        for r in history_rows:
            history.append({
                "id": r[0],
                "type": r[1],
                "durationMinutes": r[2],
                "completedAt": r[3]
            })

        return {
            "focusSecs": rows.get("focus_secs", 0),
            "breakSecs": rows.get("break_secs", 0),
            "history": history
        }
    except Exception as e:
        print(f"Error loading pomo stats from SQLite: {e}")
        return {"focusSecs": 0, "breakSecs": 0, "history": []}

def save_pomo_stats(data):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        focus_secs = data.get("focusSecs", 0)
        break_secs = data.get("breakSecs", 0)
        history = data.get("history", [])

        cursor.execute("INSERT OR REPLACE INTO pomo_stats (key, val) VALUES ('focus_secs', ?)", (focus_secs,))
        cursor.execute("INSERT OR REPLACE INTO pomo_stats (key, val) VALUES ('break_secs', ?)", (break_secs,))

        cursor.execute("DELETE FROM pomo_history")
        for item in history:
            cursor.execute("""
                INSERT INTO pomo_history (id, type, durationMinutes, completedAt)
                VALUES (?, ?, ?, ?)
            """, (item.get("id"), item.get("type", "Fokus"), item.get("durationMinutes", 25), item.get("completedAt", "")))

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving pomo stats to SQLite: {e}")
        return False

def generate_markdown_export():
    notes = load_notes()
    cols = load_columns()

    col_map = {c["id"]: c["title"] for c in cols}

    lines = []
    lines.append("# 📋 Kanban Notes Export")
    lines.append(f"*Diexport pada: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")

    for col in cols:
        col_notes = [n for n in notes if n.get("column") == col["id"]]
        lines.append(f"## {col['title']} ({len(col_notes)})")
        lines.append("---")
        if not col_notes:
            lines.append("*(Tidak ada catatan)*\n")
            continue

        for note in col_notes:
            prio = (note.get("priority") or "medium").upper()
            tag = note.get("tag") or "Umum"
            lines.append(f"### 📌 {note.get('title', 'Tanpa Judul')}")
            lines.append(f"- **Prioritas**: `{prio}`")
            lines.append(f"- **Tag**: `#{tag}`")
            if note.get("createdAt"):
                lines.append(f"- **Dibuat**: {note.get('createdAt')}")
            if note.get("content"):
                lines.append(f"\n{note.get('content')}\n")
            lines.append("\n")

    return "\n".join(lines)

def load_theme():
    init_db()
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT val FROM settings WHERE key = 'theme'")
        row = cursor.fetchone()
        conn.close()
        return row[0] if row and row[0] else "dark"
    except Exception as e:
        print(f"Error loading theme from SQLite: {e}")
        return "dark"

def save_theme(theme_name):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, val) VALUES ('theme', ?)", (theme_name,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving theme to SQLite: {e}")
        return False

