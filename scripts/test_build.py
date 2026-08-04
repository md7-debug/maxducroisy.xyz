#!/usr/bin/env python3
"""Unit tests for deterministic site generation."""

from __future__ import annotations

import unittest

import build


class BuildTests(unittest.TestCase):
    def test_latest_rss_date_uses_latest_exact_entry_date(self) -> None:
        entries = [
            {"date": "2026-07-17"},
            {"date": "2026"},
            {"date": "2026-08-04"},
        ]

        self.assertEqual(
            build.latest_rss_date(entries),
            "Tue, 04 Aug 2026 00:00:00 +0000",
        )

    def test_latest_rss_date_is_empty_without_an_exact_date(self) -> None:
        self.assertEqual(build.latest_rss_date([{"date": "2026"}]), "")


if __name__ == "__main__":
    unittest.main()
