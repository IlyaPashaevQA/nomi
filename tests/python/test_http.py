import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from demo_server import DemoHandler, DemoStore, ThreadingHTTPServer, TOKENS


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), DemoHandler)
        self.server.store = DemoStore(Path(self.temp.name) / "demo.sqlite3")
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = f"http://127.0.0.1:{self.server.server_port}"
        self.sync = f"/demo-a/languages-v05/api/session/{TOKENS['demo-a']}/sync/languages-v05"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)
        self.temp.cleanup()

    def request(self, path, payload=None, origin=None, content_type="application/json"):
        headers = {"Content-Type": content_type}
        if origin:
            headers["Origin"] = origin
        body = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request(self.origin + path, data=body, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=2) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as response:
            try:
                return response.code, response.read()
            finally:
                response.close()

    def test_wrong_profile_capability_is_denied(self):
        code, _ = self.request(self.sync.replace("demo-a/languages-v05/", "demo-b/languages-v05/", 1))
        self.assertEqual(code, 403)

    def test_cross_origin_write_is_denied(self):
        code, _ = self.request(self.sync, {}, origin="https://example.invalid")
        self.assertEqual(code, 403)

    def test_non_object_json_has_clear_error_and_server_remains_usable(self):
        code, body = self.request(self.sync, [])
        self.assertEqual(code, 400)
        self.assertEqual(json.loads(body)["error"], "JSON object required")
        self.assertEqual(self.request(self.sync)[0], 200)

    def test_non_json_body_is_rejected(self):
        self.assertEqual(self.request(self.sync, {}, content_type="text/plain")[0], 400)

    def test_static_path_traversal_does_not_expose_server_source(self):
        self.assertEqual(self.request("/demo-a/languages-v05/../../../demo_server.py")[0], 404)

    def test_unknown_routes_are_not_reported_as_success(self):
        self.assertEqual(self.request("/demo-a/languages-v05/api/not-a-real-api")[0], 403)
        self.assertEqual(self.request("/missing")[0], 404)


if __name__ == "__main__":
    unittest.main()
