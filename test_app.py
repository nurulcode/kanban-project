#!/usr/bin/env python3
import os
import sys
import json
import socket
import sqlite3
import unittest
import threading
from http.server import HTTPServer
import urllib.request
import urllib.parse

# Import functions from backend modules
import main
import db
import server

class TestKanbanBackend(unittest.TestCase):
    def setUp(self):
        # Use a temporary test database
        self.test_db = os.path.join(db.WORKSPACE_DIR, "test_kanban.db")
        db.DB_FILE = self.test_db

        # Reset DB before each test
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        
        db.init_db()

    def tearDown(self):
        # Clean up test database
        if os.path.exists(self.test_db):
            os.remove(self.test_db)

    def test_database_initialization(self):
        """Test if database table 'notes' is created and initial default notes are populated."""
        conn = sqlite3.connect(self.test_db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
        table = cursor.fetchone()
        self.assertIsNotNone(table, "Table 'notes' should exist in SQLite database")

        cursor.execute("SELECT COUNT(*) FROM notes")
        count = cursor.fetchone()[0]
        self.assertGreater(count, 0, "Default notes should be seeded in the database")
        conn.close()

    def test_load_and_save_notes(self):
        """Test loading and saving notes to SQLite database."""
        test_notes = [
            {
                "id": "test-note-1",
                "title": "UnitTest Note 1",
                "content": "Content for test 1",
                "column": "todo",
                "priority": "high",
                "tag": "Testing",
                "createdAt": "2026-08-08 16:15"
            },
            {
                "id": "test-note-2",
                "title": "UnitTest Note 2",
                "content": "Content for test 2",
                "column": "done",
                "priority": "low",
                "tag": "DoneTask",
                "createdAt": "2026-08-08 16:16"
            }
        ]

        save_success = db.save_notes(test_notes)
        self.assertTrue(save_success, "save_notes should return True on success")

        loaded_notes = db.load_notes()
        self.assertEqual(len(loaded_notes), 2, "Loaded notes count should match saved count")
        self.assertEqual(loaded_notes[0]["title"], "UnitTest Note 1")
        self.assertEqual(loaded_notes[1]["column"], "done")

    def test_http_rest_api(self):
        """Test HTTP GET /api/notes and POST /api/notes REST API endpoints."""
        port = main.find_free_port()
        srv = HTTPServer(('127.0.0.1', port), server.KanbanRequestHandler)
        server_thread = threading.Thread(target=srv.serve_forever, daemon=True)
        server_thread.start()

        try:
            # 1. Test GET /api/notes
            url = f"http://127.0.0.1:{port}/api/notes"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                self.assertEqual(resp.status, 200)
                data = json.loads(resp.read().decode('utf-8'))
                self.assertIsInstance(data, list)
                self.assertGreater(len(data), 0)

            # 2. Test POST /api/notes
            new_notes = [
                {
                    "id": "api-note-1",
                    "title": "API Test Note",
                    "content": "Saved via HTTP POST",
                    "column": "in_progress",
                    "priority": "urgent",
                    "tag": "API",
                    "createdAt": "2026-08-08 16:17"
                }
            ]

            post_data = json.dumps(new_notes).encode('utf-8')
            post_req = urllib.request.Request(url, data=post_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(post_req) as post_resp:
                self.assertEqual(post_resp.status, 200)
                res_json = json.loads(post_resp.read().decode('utf-8'))
                self.assertTrue(res_json.get("success"))

            # Verify saved via GET
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                self.assertEqual(len(data), 1)
                self.assertEqual(data[0]["title"], "API Test Note")

            # 3. Test POST /api/popout
            popout_url = f"http://127.0.0.1:{port}/api/popout"
            popout_data = json.dumps({"id": "api-note-1"}).encode('utf-8')
            popout_req = urllib.request.Request(popout_url, data=popout_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(popout_req) as popout_resp:
                self.assertEqual(popout_resp.status, 200)
                res = json.loads(popout_resp.read().decode('utf-8'))
                self.assertTrue(res.get("success"))

            # 4. Test GET & POST /api/columns
            cols_url = f"http://127.0.0.1:{port}/api/columns"
            cols_req = urllib.request.Request(cols_url)
            with urllib.request.urlopen(cols_req) as cols_resp:
                self.assertEqual(cols_resp.status, 200)
                cols_data = json.loads(cols_resp.read().decode('utf-8'))
                self.assertIsInstance(cols_data, list)
                self.assertGreaterEqual(len(cols_data), 4)

            # 5. Test GET /api/export
            exp_url = f"http://127.0.0.1:{port}/api/export"
            exp_req = urllib.request.Request(exp_url)
            with urllib.request.urlopen(exp_req) as exp_resp:
                self.assertEqual(exp_resp.status, 200)
                exp_data = json.loads(exp_resp.read().decode('utf-8'))
                self.assertTrue(exp_data.get("success"))
                self.assertTrue(os.path.exists(exp_data.get("path")))

            # 6. Test GET & POST /api/theme
            theme_url = f"http://127.0.0.1:{port}/api/theme"
            post_theme_data = json.dumps({"theme": "light"}).encode('utf-8')
            post_theme_req = urllib.request.Request(theme_url, data=post_theme_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(post_theme_req) as post_t_resp:
                self.assertEqual(post_t_resp.status, 200)
                t_res = json.loads(post_t_resp.read().decode('utf-8'))
                self.assertTrue(t_res.get("success"))
                self.assertEqual(t_res.get("theme"), "light")

            # 7. Test POST /api/notify
            notify_url = f"http://127.0.0.1:{port}/api/notify"
            notify_data = json.dumps({"title": "Test Notifikasi", "body": "Uji Coba Notifikasi Kanban Notes"}).encode('utf-8')
            notify_req = urllib.request.Request(notify_url, data=notify_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(notify_req) as notify_resp:
                self.assertEqual(notify_resp.status, 200)
                n_res = json.loads(notify_resp.read().decode('utf-8'))
                self.assertIn("success", n_res)

        finally:
            srv.shutdown()

if __name__ == "__main__":
    unittest.main()
