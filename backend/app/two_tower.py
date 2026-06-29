"""
Two-tower blend weight learning (see two_tower.py).
"""

from __future__ import annotations

import numpy as np

from .rec_common import mf_alpha, mf_score_all, normalize_score_map
from .content_recommender import ContentRecommender
from .recommender import MatrixFactorizationRecommender


def _rating_norm(ratings: dict[int, float]) -> dict[int, float]:
    return normalize_score_map(ratings)


def learn_blend_alpha(
    user_id: int,
    rated_book_ids: set[int],
    rated_values: dict[int, float],
    mf: MatrixFactorizationRecommender,
    content: ContentRecommender,
) -> tuple[float, str]:
    n = len(rated_book_ids)
    if n < 2 or not mf.is_fitted:
        return mf_alpha(n), "heuristic"

    mf_raw = mf_score_all(mf, user_id, set())
    mf_norm = normalize_score_map({bid: mf_raw[bid] for bid in rated_book_ids if bid in mf_raw})
    content_raw = content.score_all(rated_book_ids)
    content_norm = normalize_score_map(content_raw)
    target = _rating_norm(rated_values)

    best_alpha = mf_alpha(n)
    best_err = float("inf")

    for alpha in np.linspace(0.0, 0.85, 18):
        err = 0.0
        count = 0
        for bid in rated_book_ids:
            if bid not in target:
                continue
            pred = alpha * mf_norm.get(bid, 0.0) + (1.0 - alpha) * content_norm.get(bid, 0.0)
            err += (pred - target[bid]) ** 2
            count += 1
        if count and err / count < best_err:
            best_err = err / count
            best_alpha = float(alpha)

    return best_alpha, "learned"
