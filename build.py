#!/usr/bin/env python3
"""Generate static text and RSS editions from index.html."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE_URL = os.environ.get("SITE_URL", "http://127.0.0.1:4173").rstrip("/")


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_main = False
        self.in_footer = False
        self.skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "main":
            self.in_main = True
        elif tag == "footer":
            self.in_footer = True
        if not self.in_main or self.in_footer:
            return
        if tag in {"script", "style", "dialog"}:
            self.skip_depth += 1
        if tag in {"h1", "h2", "h3", "p", "li", "article", "section"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag == "main":
            self.in_main = False
        if tag == "footer":
            self.in_footer = False
        if tag in {"script", "style", "dialog"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.in_main or self.in_footer or self.skip_depth:
            return
        text = " ".join(data.split())
        if not text:
            return
        self.parts.append(text + " ")


def clean_text(parts: list[str]) -> str:
    lines = []
    for raw in "".join(parts).splitlines():
        line = " ".join(raw.split())
        line = re.sub(r"\s+([,.;:!?])", r"\1", line)
        if line and (not lines or line != lines[-1]):
            lines.append(line)
    return "\n\n".join(lines) + "\n"


def absolute_url(url: str) -> str:
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"{SITE_URL}/{url.lstrip('/')}"


def rss_date(value: str) -> str:
    parsed = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return parsed.strftime("%a, %d %b %Y 00:00:00 +0000")


def latest_rss_date(entries: list[dict[str, str]]) -> str:
    exact_dates = [
        entry["date"]
        for entry in entries
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", entry.get("date", ""))
    ]
    return rss_date(max(exact_dates)) if exact_dates else ""


def catalogue_text(entries: list[dict[str, str]]) -> str:
    if not entries:
        return ""
    lines = ["Browse"]
    for entry in entries:
        details = " · ".join(
            item
            for item in (
                entry.get("date", ""),
                entry.get("type", ""),
                entry.get("classification", ""),
            )
            if item
        )
        lines.append(f"{details}\n{entry.get('title', '')}\n{entry.get('href', '')}")
    return "\n\n".join(lines) + "\n"


def sitemap_url(url: str, last_modified: str = "") -> str:
    modified = f"<lastmod>{escape(last_modified)}</lastmod>" if last_modified else ""
    return f"<url><loc>{escape(url)}</loc>{modified}</url>"


def main() -> None:
    parser = PageParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    catalogue = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
    entries = catalogue.get("entries", [])
    page_text = clean_text(parser.parts) + "\n" + catalogue_text(entries)

    (ROOT / "index.txt").write_text(page_text, encoding="utf-8")
    (ROOT / "llms.txt").write_text(
        "# Max Ducroisy\n\n"
        "Personal site for Max Ducroisy.\n\n"
        f"Canonical site: {SITE_URL}/\n"
        f"Plain-text edition: {SITE_URL}/index.txt\n"
        f"RSS feed: {SITE_URL}/feed.xml\n\n"
        "## Page content\n\n"
        + page_text,
        encoding="utf-8",
    )

    exact_dates = sorted(
        entry["date"]
        for entry in entries
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", entry.get("date", ""))
    )
    sitemap_items = [sitemap_url(f"{SITE_URL}/", exact_dates[-1] if exact_dates else "")]
    sitemap_items.extend(
        sitemap_url(absolute_url(entry["href"]), entry.get("date", "") if len(entry.get("date", "")) == 10 else "")
        for entry in entries
        if entry.get("href") and not entry["href"].startswith(("http://", "https://"))
    )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(sitemap_items)
        + "</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")

    items = []
    feed_entries = [
        entry
        for entry in entries
        if entry.get("kind") in {"writing", "video", "note"} and entry.get("href")
    ]
    last_build_date = latest_rss_date(feed_entries)
    last_build_markup = f"<lastBuildDate>{last_build_date}</lastBuildDate>" if last_build_date else ""
    for entry in sorted(feed_entries, key=lambda item: item.get("date", ""), reverse=True):
        url = absolute_url(entry["href"])
        published = ""
        if entry.get("dateKind") == "published" and re.fullmatch(r"\d{4}-\d{2}-\d{2}", entry.get("date", "")):
            published = f"<pubDate>{rss_date(entry['date'])}</pubDate>"
        items.append(
            "<item>"
            f"<title>{escape(entry['title'])}</title>"
            f"<link>{escape(url)}</link>"
            f"<guid>{escape(url)}</guid>"
            f"{published}"
            f"<description>{escape(entry['description'])}</description>"
            "</item>"
        )

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0"><channel>'
        '<title>Max Ducroisy</title>'
        f'<link>{escape(SITE_URL)}/</link>'
        '<description>Work and projects from Max Ducroisy.</description>'
        f'{last_build_markup}'
        + "".join(items)
        + "</channel></rss>\n"
    )
    (ROOT / "feed.xml").write_text(feed, encoding="utf-8")


if __name__ == "__main__":
    main()
