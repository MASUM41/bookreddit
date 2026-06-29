"""Shared scoring helpers for hybrid and two-tower blend."""

from __future__ import annotations

import numpy as np

from .content_recommender import ContentRecommender
from .recommender import MatrixFactorizationRecommender


def normalize_score_map(scores: dict[int, float]) -> dict[int, float]:
    if not scores:
        return {}
    vals = np.array(list(scores.values()), dtype=np.float64)
    lo, hi = float(vals.min()), float(vals.max())
    if hi - lo < 1e-9:
        return {k: 0.5 for k in scores}
    return {k: (v - lo) / (hi - lo) for k, v in scores.items()}


def mf_alpha(n_ratings: int) -> float:
    if n_ratings <= 0:
        return 0.0
    return min(0.85, n_ratings * 0.17)


def mf_score_all(
    mf: MatrixFactorizationRecommender,
    user_id: int,
    rated_book_ids: set[int],
) -> dict[int, float]:
    if not mf.is_fitted or mf.P is None or mf.Q is None:
        return {}

    cold_start = user_id not in mf.user_id_to_idx
    if cold_start:
        p_u = mf.P.mean(axis=0)
    else:
        p_u = mf.P[mf.user_id_to_idx[user_id]]

    raw: np.ndarray = p_u @ mf.Q.T
    result: dict[int, float] = {}
    for idx, book_id in mf.idx_to_book_id.items():
        if book_id in rated_book_ids:
            continue
        result[book_id] = float(raw[idx])
    return result


def book_content_vectors(content: ContentRecommender) -> dict[int, np.ndarray]:
    if not content.is_fitted or content.C is None:
        return {}
    return {content.idx_to_book_id[i]: content.C[i] for i in range(len(content.C))}


def user_content_profile(
    content: ContentRecommender,
    book_ids: set[int],
) -> np.ndarray | None:
    if not content.is_fitted or content.C is None or not book_ids:
        return None
    indices = [
        content.book_id_to_idx[bid]
        for bid in book_ids
        if bid in content.book_id_to_idx
    ]
    if not indices:
        return None
    profile = content.C[indices].mean(axis=0)
    norm = np.linalg.norm(profile)
    if norm > 1e-9:
        profile = profile / norm
    return profile
