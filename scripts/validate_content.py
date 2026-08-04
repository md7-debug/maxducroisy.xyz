#!/usr/bin/env python3
"""Validate the public content catalogue and local note metadata."""

from __future__ import annotations

import json
import re
from datetime import date as calendar_date
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
CATALOGUE_PATH = ROOT / "content.json"
SITE_URL = "https://maxducroisy.xyz"
ALLOWED_KINDS = {"writing", "project", "video", "note"}
COMMON_FIELDS = {
    "id",
    "kind",
    "type",
    "date",
    "classification",
    "title",
    "description",
    "href",
    "link",
}
PUBLISHED_FIELDS = {"source", "readingTime"}
DATE_PATTERN = re.compile(r"(?:\d{4}|\d{4}-\d{2}-\d{2})\Z")
ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def local_path(href: str) -> Path | None:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc:
        return None
    path = (ROOT / parts.path.lstrip("/")).resolve()
    if not path.is_relative_to(ROOT.resolve()):
        return None
    return path


def source_path(href: str) -> Path | None:
    path = local_path(href)
    if path is None or path.is_file() or path.suffix:
        return path
    html_path = path.with_suffix(".html")
    return html_path if html_path.is_file() else path


def validate_note(entry: dict[str, str], errors: list[str]) -> None:
    path = source_path(entry["href"])
    if path is None:
        fail(errors, f"{entry['id']}: notes must use a local href")
        return
    if not path.is_file():
        fail(errors, f"{entry['id']}: local page does not exist: {path.relative_to(ROOT)}")
        return

    html = path.read_text(encoding="utf-8")
    canonical = f"{SITE_URL}/{entry['href'].lstrip('/')}"
    required_fragments = {
        "title": entry["title"],
        "description": entry["description"],
        "canonical URL": canonical,
        "published date": f'"datePublished": "{entry["date"]}"',
        "visible date": f'datetime="{entry["date"]}"',
        "social image": f"{SITE_URL}/assets/social-card.png",
    }
    for label, fragment in required_fragments.items():
        if fragment not in html:
            fail(errors, f"{entry['id']}: note page is missing matching {label}")

    if html.count("<h1") != 1:
        fail(errors, f"{entry['id']}: note page must contain exactly one h1")


def main() -> int:
    errors: list[str] = []
    try:
        payload = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"content validation failed: {exc}")
        return 1

    entries = payload.get("entries")
    if not isinstance(entries, list):
        print("content validation failed: entries must be a list")
        return 1

    seen_ids: set[str] = set()
    seen_hrefs: set[str] = set()

    for index, raw_entry in enumerate(entries):
        if not isinstance(raw_entry, dict):
            fail(errors, f"entry {index}: expected an object")
            continue
        entry = raw_entry
        label = str(entry.get("id", f"entry {index}"))

        missing = sorted(COMMON_FIELDS - entry.keys())
        if entry.get("kind") in {"writing", "video", "note"}:
            missing.extend(sorted(PUBLISHED_FIELDS - entry.keys()))
        if missing:
            fail(errors, f"{label}: missing fields: {', '.join(missing)}")
            continue

        invalid_strings = False
        for key, value in entry.items():
            if not isinstance(value, str):
                fail(errors, f"{label}: {key} must be a string")
                invalid_strings = True
            elif value != value.strip() or not value:
                fail(errors, f"{label}: {key} must be non-empty without surrounding whitespace")
                invalid_strings = True
        if invalid_strings:
            continue

        entry_id = entry["id"]
        if not ID_PATTERN.fullmatch(entry_id):
            fail(errors, f"{label}: id must be a lowercase hyphenated slug")
        if entry_id in seen_ids:
            fail(errors, f"{label}: duplicate id")
        seen_ids.add(entry_id)

        kind = entry["kind"]
        if kind not in ALLOWED_KINDS:
            fail(errors, f"{label}: unsupported kind {kind!r}")

        date = entry["date"]
        if not DATE_PATTERN.fullmatch(date):
            fail(errors, f"{label}: date must be YYYY or YYYY-MM-DD")
        elif len(date) == 10:
            try:
                calendar_date.fromisoformat(date)
            except ValueError:
                fail(errors, f"{label}: date is not a real calendar date")
            if "dateKind" not in entry:
                fail(errors, f"{label}: exact dates require dateKind")
        if "dateKind" in entry and entry["dateKind"] not in {"published", "updated"}:
            fail(errors, f"{label}: dateKind must be published or updated")

        href = entry["href"]
        href_parts = urlsplit(href)
        if href_parts.scheme and href_parts.scheme not in {"http", "https"}:
            fail(errors, f"{label}: href must use http, https or a local relative path")
        if href_parts.scheme in {"http", "https"} and not href_parts.netloc:
            fail(errors, f"{label}: external href is missing a host")
        if href in seen_hrefs:
            fail(errors, f"{label}: duplicate href")
        seen_hrefs.add(href)

        path = source_path(href)
        if not href_parts.scheme and path is None:
            fail(errors, f"{label}: local href must stay inside the repository")
        if path is not None and not path.is_file():
            fail(errors, f"{label}: local href does not exist: {href}")

        if kind == "note" and not missing:
            validate_note(entry, errors)

    if errors:
        print("content validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"content validation passed: {len(entries)} entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
