"""
Map library Class_No / Dewey Decimal codes to readable browse categories.

Example: "823.914 LES" → "Literature", "294 MUL" → "Religion"
"""

from __future__ import annotations

import re

# Standard Dewey hundreds divisions (000–900)
DEWEY_LABELS: dict[int, str] = {
    0: "General & Computing",
    100: "Philosophy & Psychology",
    200: "Religion",
    300: "Social Sciences",
    400: "Language",
    500: "Science & Math",
    600: "Technology & Medicine",
    700: "Arts & Entertainment",
    800: "Literature",
    900: "History & Geography",
}

_CLASS_NO_RE = re.compile(r"^\s*(\d{1,3}(?:\.\d+)?)")


def parse_dewey_number(class_no: str) -> float | None:
    """Extract the leading Dewey number from a Class_No string."""
    if not class_no:
        return None
    match = _CLASS_NO_RE.match(class_no.strip())
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def looks_like_class_no(value: str) -> bool:
    return parse_dewey_number(value) is not None


def dewey_to_genre(class_no: str) -> str:
    """
    Convert a Class_No / Dewey string to a human-readable category.
    Non-numeric values (already mapped genres) are returned unchanged.
    """
    code = parse_dewey_number(class_no)
    if code is None:
        text = (class_no or "").strip()
        return text if text else "Uncategorized"

    hundreds = int(code // 100) * 100
    if hundreds > 900:
        hundreds = 900
    return DEWEY_LABELS.get(hundreds, "Uncategorized")
