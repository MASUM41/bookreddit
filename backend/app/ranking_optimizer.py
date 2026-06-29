"""
Constrained re-ranking for top-N recommendations:
  - MMR with content-vector distance
  - Genre cap (≤2 per genre)
  - Author diversity (prefer new authors)
  - Serendipity: penalise books too close to user profile centroid
"""

from __future__ import annotations

import numpy as np


def _author_key(author: str | None) -> str:
    if not author:
        return ""
    return author.strip().lower()[:40]


def select_constrained(
    blended: dict[int, float],
    book_genres: dict[int, str | None],
    book_authors: dict[int, str | None],
    book_vectors: dict[int, np.ndarray],
    user_profile: np.ndarray | None,
    n: int,
    *,
    max_per_genre: int = 2,
    lambda_rel: float = 0.7,
    serendipity_beta: float = 0.18,
    max_author_repeat: int = 1,
) -> list[tuple[int, float]]:
    if not blended:
        return []

    remaining = dict(blended)
    selected: list[tuple[int, float]] = []
    selected_vectors: list[np.ndarray] = []
    genre_counts: dict[str, int] = {}
    author_counts: dict[str, int] = {}

    while remaining and len(selected) < n:
        candidates = []

        for bid, rel in remaining.items():
            genre = book_genres.get(bid) or ""
            author = _author_key(book_authors.get(bid))

            if genre and genre_counts.get(genre, 0) >= max_per_genre:
                continue
            if author and author_counts.get(author, 0) >= max_author_repeat:
                continue

            penalty = 0.0
            if genre and genre_counts.get(genre, 0) > 0:
                penalty = max(penalty, 0.5)

            vec = book_vectors.get(bid)
            if vec is not None and selected_vectors:
                penalty = max(penalty, max(float(vec @ sv) for sv in selected_vectors))

            if user_profile is not None and vec is not None:
                sim = float(vec @ user_profile)
                if sim > 0.92:
                    penalty = max(penalty, serendipity_beta * sim)

            score = lambda_rel * rel - (1.0 - lambda_rel) * penalty
            candidates.append((bid, score, rel))

        if not candidates:
            break

        pick, _, rel = max(candidates, key=lambda x: x[1])
        remaining.pop(pick)
        selected.append((pick, rel))

        genre = book_genres.get(pick) or ""
        if genre:
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
        author = _author_key(book_authors.get(pick))
        if author:
            author_counts[author] = author_counts.get(author, 0) + 1
        vec = book_vectors.get(pick)
        if vec is not None:
            selected_vectors.append(vec)

    return selected
