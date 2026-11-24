#!/usr/bin/env python3
"""Record backup stage transitions without running the backup itself."""

import argparse
import fcntl
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_PATH = Path("/var/lib/ceramisys/backup-status.json")
EVENTS = ("start", "local-succeeded", "local-failed", "drive-succeeded", "drive-failed", "interrupted")


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Missing timezone")
    return parsed.astimezone(timezone.utc)


def read_status(path):
    try:
        with path.open("rb") as source:
            data = source.read(8193)
        if len(data) <= 8192:
            status = json.loads(data)
            if isinstance(status, dict) and status.get("schemaVersion") == 1:
                return status
    except (FileNotFoundError, ValueError):
        pass
    return {}


def stored_timestamp(status, key):
    try:
        return timestamp(status[key])
    except (KeyError, AttributeError, TypeError, ValueError):
        return None


def transition(status, event, started, now):
    if started > now:
        raise ValueError("Start time is in the future")

    if event == "start":
        current = stored_timestamp(status, "startedAt")
        if current is not None and current >= started:
            raise ValueError("A newer or identical attempt already exists")
        success = stored_timestamp(status, "lastSuccessfulAt")
        return {
            "schemaVersion": 1,
            "startedAt": started.isoformat(),
            "finishedAt": None,
            "localStatus": "pending",
            "driveStatus": "pending",
            "lastSuccessfulAt": success.isoformat() if success is not None and success <= started else None,
            "errorCode": None,
        }

    if status.get("startedAt") != started.isoformat() or status.get("finishedAt") is not None:
        raise ValueError("Event has no matching active attempt")

    local = status.get("localStatus")
    if local == "pending" and event == "local-succeeded":
        status["localStatus"] = "succeeded"
        return status

    match (local, event):
        case ("pending", "local-failed"):
            status.update(localStatus="failed", driveStatus="skipped", errorCode="local_backup_failed")
        case ("pending", "interrupted"):
            status.update(localStatus="failed", driveStatus="skipped", errorCode="interrupted")
        case ("succeeded", "drive-succeeded"):
            status.update(driveStatus="succeeded", lastSuccessfulAt=now.isoformat())
        case ("succeeded", "drive-failed"):
            status.update(driveStatus="failed", errorCode="drive_upload_failed")
        case ("succeeded", "interrupted"):
            status.update(driveStatus="failed", errorCode="interrupted")
        case _:
            raise ValueError("Unexpected stage transition")

    status["finishedAt"] = now.isoformat()
    return status


def write_atomic(path, status):
    fd, temp_name = tempfile.mkstemp(prefix=".backup-status-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as target:
            os.fchmod(target.fileno(), 0o640)
            json.dump(status, target, separators=(",", ":"))
            target.write("\n")
            target.flush()
            os.fsync(target.fileno())
        os.replace(temp_name, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        Path(temp_name).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("event", choices=EVENTS)
    parser.add_argument("started_at", help="Same ISO 8601 value with timezone for every event of this attempt")
    parser.add_argument("--path", type=Path, default=DEFAULT_PATH, help="Destination status file")
    args = parser.parse_args()
    os.umask(0o027)
    try:
        started = timestamp(args.started_at)
        lock_path = args.path.with_name(f".{args.path.name}.lock")
        with lock_path.open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            status = transition(read_status(args.path), args.event, started, datetime.now(timezone.utc))
            write_atomic(args.path, status)
    except (OSError, ValueError):
        parser.exit(1, "Ceramisys: falha ao publicar o evento de status do backup.\n")


if __name__ == "__main__":
    main()
