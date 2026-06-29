"""Cover URL helpers — Open Library by ISBN."""

from __future__ import annotations

import re


def normalize_isbn_digits(isbn: str | None) -> str | None:
    if not isbn:
        return None
    digits = re.sub(r"[^0-9Xx]", "", str(isbn).strip())
    if len(digits) < 10:
        return None
    return digits[:13]


def open_library_cover_url(isbn: str | None, *, size: str = "M") -> str | None:
    """Public Open Library cover endpoint (no API key)."""
    digits = normalize_isbn_digits(isbn)
    if not digits:
        return None
    return f"https://covers.openlibrary.org/b/isbn/{digits}-{size}.jpg"


def resolve_cover_url(
    cover_url: str | None,
    isbn: str | None,
) -> str | None:
    if cover_url and str(cover_url).strip():
        return str(cover_url).strip()
    return open_library_cover_url(isbn)
