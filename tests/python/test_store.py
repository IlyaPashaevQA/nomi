import concurrent.futures
import tempfile
import unittest
from pathlib import Path

from demo_server import DemoStore


def state(event_id="intro-1"):
    return {"alpha20": {"schema": 1, "courseId": "he-alpha20", "events": [{
        "eventId": event_id, "attemptId": "attempt-1", "sessionId": "lesson-1",
        "deviceId": "device-1", "taskId": "task-1", "at": 1000,
        "countsAsEvidence": False, "mechanic": "intro", "completed": True,
        "targets": ["בית"], "correct": None,
    }]}}


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DemoStore(Path(self.temp.name) / "demo.sqlite3")

    def tearDown(self):
        self.temp.cleanup()

    def test_stale_checkpoint_returns_conflict_and_next_write_still_works(self):
        first = self.store.put("dasha", 0, state())
        self.assertEqual(first["revision"], 1)
        # Regression: returning a stale revision must not retain a lock.
        with concurrent.futures.ThreadPoolExecutor() as executor:
            stale = executor.submit(self.store.put, "dasha", 0, state()).result(timeout=2)
        self.assertTrue(stale["conflict"])
        self.assertEqual(stale["state"], state())
        self.assertFalse(self.store.put("dasha", 1, state())["conflict"])

    def test_profiles_have_separate_histories(self):
        self.store.put("dasha", 0, state())
        self.assertIsNone(self.store.get("ilia")["state"])
        self.assertEqual(self.store.get("ilia")["revision"], 0)

    def test_events_cannot_be_deleted_or_rewritten(self):
        self.store.put("dasha", 0, state())
        with self.assertRaises(ValueError):
            self.store.put("dasha", 1, {"alpha20": {"schema": 1, "courseId": "he-alpha20", "events": []}})
        altered = state()
        altered["alpha20"]["events"][0]["targets"] = ["ספר"]
        with self.assertRaises(ValueError):
            self.store.put("dasha", 1, altered)
        self.assertEqual(self.store.get("dasha")["state"], state())

    def test_duplicate_event_ids_are_rejected(self):
        value = state()
        value["alpha20"]["events"] *= 2
        with self.assertRaises(ValueError):
            self.store.put("dasha", 0, value)

    def test_unknown_profile_and_boolean_revision_are_rejected(self):
        with self.assertRaises(ValueError):
            self.store.get("unknown")
        with self.assertRaises(ValueError):
            self.store.put("dasha", True, state())

    def test_reopening_store_preserves_progress(self):
        self.store.put("dasha", 0, state())
        reopened = DemoStore(self.store.path)
        self.assertEqual(reopened.get("dasha")["state"], state())


if __name__ == "__main__":
    unittest.main()
