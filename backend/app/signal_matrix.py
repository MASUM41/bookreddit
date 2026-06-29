"""
Build a combined user×book training signal from explicit + implicit interactions.

Priority per (user, book): rating > upvote > downvote > bookmark.
Implicit entries use confidence-weighted pseudo-ratings (Hu et al. style).
Recent interactions are up-weighted via exponential time decay.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import text

from .database import engine
from .models import InteractionType

_PRIORITY = {
    InteractionType.rating: 4,
    InteractionType.upvote: 3,
    InteractionType.downvote: 2,
    InteractionType.bookmark: 1,
}

_SIGNAL = {
    InteractionType.rating: lambda v: (float(v), 1.0),
    InteractionType.upvote: lambda v: (4.0, 0.65),
    InteractionType.downvote: lambda v: (2.0, 0.45),
    InteractionType.bookmark: lambda v: (3.5, 0.55),
}

# Half-life ≈ 90 days: w = exp(-DECAY_LAMBDA * days)
DECAY_LAMBDA = 0.0077


def _time_decay_multiplier(created_at) -> float:
    if created_at is None:
        return 1.0
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    days = max(0.0, (datetime.now(timezone.utc) - created_at).total_seconds() / 86400.0)
    return math.exp(-DECAY_LAMBDA * days)


@dataclass(frozen=True)
class TrainingRow:
    user_id: int
    book_id: int
    value: float
    confidence: float


def load_combined_interactions() -> pd.DataFrame:
    """Returns columns: user_id, book_id, value, confidence."""
    query = text("""
        SELECT user_id, book_id, interaction_type, value, created_at
        FROM user_book_interactions
        ORDER BY user_id, book_id
    """)
    with engine.connect() as conn:
        raw = pd.read_sql(query, conn)

    if raw.empty:
        return pd.DataFrame(columns=["user_id", "book_id", "value", "confidence"])

    best: dict[tuple[int, int], TrainingRow] = {}
    type_by_key: dict[tuple[int, int], InteractionType] = {}

    for row in raw.itertuples(index=False):
        itype = InteractionType(row.interaction_type)
        key = (int(row.user_id), int(row.book_id))
        if key not in type_by_key or _PRIORITY[itype] > _PRIORITY[type_by_key[key]]:
            value, confidence = _SIGNAL[itype](row.value)
            confidence *= _time_decay_multiplier(row.created_at)
            best[key] = TrainingRow(key[0], key[1], value, confidence)
            type_by_key[key] = itype

    rows = list(best.values())
    return pd.DataFrame(
        {
            "user_id": [r.user_id for r in rows],
            "book_id": [r.book_id for r in rows],
            "value": [r.value for r in rows],
            "confidence": [r.confidence for r in rows],
        }
    )
