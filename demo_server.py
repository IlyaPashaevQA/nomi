"""Local-only adapter for the exported Nomi 0.5 Hebrew lesson runtime.

This intentionally has no connection to Personal Hub, real accounts or AI APIs.
The two fixed demo profiles are NOT a production authentication system.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import secrets
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
PROFILES = {"demo-a": ("dasha", "Demo Learner A"), "demo-b": ("ilia", "Demo Learner B")}
TOKENS = {key: secrets.token_urlsafe(24) for key in PROFILES}


def json_text(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


class DemoStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as con:
            con.execute("CREATE TABLE IF NOT EXISTS snapshots(profile TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)")

    def connect(self):
        return sqlite3.connect(self.path, timeout=5)

    @staticmethod
    def profile(value):
        if value not in {row[0] for row in PROFILES.values()}:
            raise ValueError("Unknown demonstration profile")
        return value

    @staticmethod
    def snapshot(con, profile):
        row = con.execute("SELECT revision,payload FROM snapshots WHERE profile=?", (profile,)).fetchone()
        return {"user_id": profile, "app_id": "languages-v05", "revision": row[0] if row else 0,
                "state": json.loads(row[1]) if row else None}

    def get(self, profile):
        self.profile(profile)
        with self.connect() as con:
            return self.snapshot(con, profile)

    @staticmethod
    def validate_state(value, previous):
        if not isinstance(value, dict) or set(value) != {"alpha20"}:
            raise ValueError("Only the demo Hebrew journal is supported")
        history = value["alpha20"]
        if not isinstance(history, dict) or history.get("schema") != 1 or history.get("courseId") != "he-alpha20":
            raise ValueError("Invalid Hebrew journal")
        events = history.get("events")
        if not isinstance(events, list) or len(events) > 10000:
            raise ValueError("Invalid events")
        identities = {}
        for event in events:
            if not isinstance(event, dict) or any(not isinstance(event.get(k), str) or not event[k]
                    for k in ["eventId", "attemptId", "sessionId", "deviceId", "taskId"]):
                raise ValueError("Invalid event identity")
            if event.get("countsAsEvidence") is not False or type(event.get("at")) is not int:
                raise ValueError("Demo history cannot claim trusted evidence")
            if event["eventId"] in identities:
                raise ValueError("Duplicate event")
            identities[event["eventId"]] = event
        for old in (previous or {}).get("alpha20", {}).get("events", []):
            if identities.get(old["eventId"]) != old:
                raise ValueError("Previously accepted events are append-only")
        lesson = history.get("dailyLesson")
        if lesson is not None and (not isinstance(lesson, dict) or lesson.get("version") != 1
                or lesson.get("status") not in ["active", "complete"]
                or not isinstance(lesson.get("sessionId"), str)):
            raise ValueError("Invalid lesson checkpoint")

    def put(self, profile, revision, state):
        self.profile(profile)
        if type(revision) is not int or revision < 0:
            raise ValueError("Invalid revision")
        # Each request owns its connection/transaction. Returning a conflict
        # releases the transaction too, so a stale client cannot deadlock it.
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            current = self.snapshot(con, profile)
            if revision != current["revision"]:
                return {**current, "conflict": True}
            self.validate_state(state, current["state"])
            next_revision = revision + 1
            con.execute("INSERT INTO snapshots VALUES(?,?,?) ON CONFLICT(profile) DO UPDATE SET revision=excluded.revision,payload=excluded.payload",
                        (profile, next_revision, json_text(state)))
            return {**self.snapshot(con, profile), "conflict": False}


class DemoHandler(BaseHTTPRequestHandler):
    server_version = "NomiDemo/0.5"

    def log_message(self, *_):
        pass

    def reply(self, value, content_type="application/json; charset=utf-8", status=200):
        body = json_text(value).encode() if content_type.startswith("application/json") else value
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def context(self, demo_id):
        profile, name = PROFILES[demo_id]
        return {"version": "languages-session-context-v1", "personId": profile, "mode": "learner",
                "capabilities": ["learner:read", "learner:write", "learner:sync"],
                "allowedSubjectScopes": [profile], "allowedAppScopes": ["languages-v05"],
                "allowedCourseScopes": ["he-alpha20"], "authorizationRevision": "local-demo-v1",
                "sessionId": "local-demo-" + demo_id, "sessionToken": TOKENS[demo_id], "displayName": name}

    def route(self):
        match = re.fullmatch(r"/(demo-[ab])/languages-v05/(.*)", urlsplit(self.path).path)
        return match.groups() if match else (None, None)

    def session_action(self, demo_id, rel):
        match = re.fullmatch(r"api/session/([^/]+)/(.+)", rel)
        if not match or not secrets.compare_digest(match[1], TOKENS[demo_id]):
            return None
        return match[2]

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/health":
            self.reply({"ok": True, "edition": "Nomi 0.5 portable core", "synthetic_data": True})
            return
        if path == "/":
            self.reply((ROOT / "web/index.html").read_bytes(), "text/html; charset=utf-8")
            return
        demo_id, rel = self.route()
        if not demo_id:
            self.reply({"error": "Not found"}, status=404)
            return
        profile = PROFILES[demo_id][0]
        if rel in ["", "index.html"]:
            text = (ROOT / "web/lesson.html").read_text().replace("__CONTEXT__", json_text(self.context(demo_id)).replace("<", "\\u003c"))
            self.reply(text.encode(), "text/html; charset=utf-8")
            return
        if rel == "api/mechanic-layout-profile":
            self.reply({"state": "empty"})
            return
        action = self.session_action(demo_id, rel)
        if action == "sync/languages-v05":
            self.reply(self.server.store.get(profile))
            return
        if action == "content-access/v1":
            self.reply(json.loads((ROOT / "demo-catalog.json").read_text()))
            return
        if action == "two-hour/parent-familiarity":
            self.reply({"familiar": []})
            return
        if rel.startswith("api/"):
            self.reply({"error": "Unknown or wrong-profile demo capability"}, status=403)
            return
        target = (ROOT / "web/languages-v05" / rel).resolve()
        web = (ROOT / "web/languages-v05").resolve()
        if not target.is_relative_to(web) or target.is_symlink() or not target.is_file():
            self.reply({"error": "Not found"}, status=404)
            return
        mime = "text/javascript" if target.suffix == ".mjs" else mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        self.reply(target.read_bytes(), mime)

    def do_POST(self):
        demo_id, rel = self.route()
        if not demo_id or self.session_action(demo_id, rel) != "sync/languages-v05":
            self.reply({"error": "Unknown or wrong-profile demo capability"}, status=403)
            return
        expected_origin = "http://" + self.headers.get("Host", "")
        if self.headers.get("Origin") not in [None, expected_origin] or self.headers.get("Sec-Fetch-Site") == "cross-site":
            self.reply({"error": "Origin denied"}, status=403)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 512000 or not self.headers.get("Content-Type", "").startswith("application/json"):
                raise ValueError("Invalid JSON request size/type")
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict):
                raise ValueError("JSON object required")
            result = self.server.store.put(PROFILES[demo_id][0], payload.get("base_revision"), payload.get("state"))
            self.reply(result, status=409 if result["conflict"] else 200)
        except (ValueError, TypeError) as error:
            self.reply({"error": str(error)}, status=400)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--data", type=Path, default=ROOT / ".demo-data/demo.sqlite3")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), DemoHandler)
    server.store = DemoStore(args.data)
    print(f"Nomi demo: http://127.0.0.1:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
