import json
import stat
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


class BackupPublisherTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name, "backup-status.json")
        self.started_at = datetime.now(timezone.utc) - timedelta(hours=1)

    def publish(self, event, started=None, ok=True):
        publisher = Path(__file__).with_name("publish-backup-status.py")
        result = subprocess.run(
            [sys.executable, publisher, event, (started or self.started_at).isoformat(), "--path", self.path],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0 if ok else 1, result.stderr)
        return json.loads(self.path.read_text())

    def test_stages_and_durable_last_success(self):
        status = self.publish("start")
        self.assertEqual(status["localStatus"], "pending")
        self.assertEqual(status["driveStatus"], "pending")
        self.assertIsNone(status["finishedAt"])
        self.assertEqual(stat.S_IMODE(self.path.stat().st_mode), 0o640)
        status = self.publish("local-succeeded")
        self.assertEqual(status["localStatus"], "succeeded")
        self.assertIsNone(status["lastSuccessfulAt"])
        status = self.publish("drive-succeeded")
        last_success = status["lastSuccessfulAt"]
        self.assertEqual(last_success, status["finishedAt"])
        self.assertIsNotNone(last_success)

        self.started_at = datetime.now(timezone.utc)
        self.publish("start")
        self.publish("local-succeeded")
        failed = self.publish("drive-failed")
        self.assertEqual(failed["errorCode"], "drive_upload_failed")
        self.assertEqual(failed["lastSuccessfulAt"], last_success)
        self.assertEqual(failed["localStatus"], "succeeded")
        self.assertEqual(failed["driveStatus"], "failed")

    def test_dump_failure_and_interruption(self):
        for event, expected in [("local-failed", "local_backup_failed"), ("interrupted", "interrupted")]:
            with self.subTest(event=event):
                self.started_at = datetime.now(timezone.utc)
                self.publish("start")
                failed = self.publish(event)
                self.assertEqual(failed["errorCode"], expected)
                self.assertEqual(failed["localStatus"], "failed")
                self.assertEqual(failed["driveStatus"], "skipped")

    def test_old_and_out_of_order_events_cannot_overwrite(self):
        self.publish("start")
        self.publish("local-succeeded")
        old = self.started_at
        self.started_at = datetime.now(timezone.utc)
        new_attempt = self.publish("start")
        self.assertEqual(new_attempt, self.publish("drive-succeeded", started=old, ok=False))
        self.assertEqual(new_attempt, self.publish("drive-succeeded", ok=False))
        self.assertEqual(new_attempt, self.publish("start", started=old, ok=False))

    def test_start_recovers_from_invalid_status(self):
        self.path.write_text('{"schemaVersion":1,"startedAt":"invalid"}')
        self.assertIsNone(self.publish("start")["lastSuccessfulAt"])


if __name__ == "__main__":
    unittest.main()
