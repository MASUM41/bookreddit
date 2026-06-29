"""
Hybrid recommendation: blend Matrix Factorization + content (TF-IDF/SVD).

Pipeline:
  1. Learned two-tower α (validation on rated books) or heuristic fallback
  2. Blend normalized MF + content scores
  3. Constrained re-rank: MMR + genre cap + author diversity + serendipity
"""

from __future__ import annotations

import numpy as np

from .content_recommender import ContentRecommender, content_recommender
from .ranking_optimizer import select_constrained
from .rec_common import (
    book_content_vectors,
    mf_score_all,
    normalize_score_map,
    user_content_profile,
)
from .recommender import MatrixFactorizationRecommender, recommender
from .onboarding import apply_genre_boost
from .two_tower import learn_blend_alpha


def _reason_for_book(
    book_id: int,
    *,
    rated_book_ids: set[int],
    bookmarked_book_ids: set[int],
    book_genres: dict[int, str | None],
    mf_scores: dict[int, float],
    content_scores: dict[int, float],
    alpha: float,
    strategy: str,
    blend_method: str,
    onboarding_genres: set[str] | None = None,
) -> str:
    genre = book_genres.get(book_id)
    if onboarding_genres and genre and genre in onboarding_genres:
        return f"Matches your starter shelf · {genre}"
    if genre:
        if any(book_genres.get(rid) == genre for rid in rated_book_ids):
            return f"Because you rated {genre}"
        if any(book_genres.get(bid) == genre for bid in bookmarked_book_ids):
            return f"From saved {genre} books"

    mf = mf_scores.get(book_id, 0.0)
    content = content_scores.get(book_id, 0.0)
    if blend_method == "learned" and strategy in ("hybrid", "mf"):
        return "Tuned to your rating pattern"
    if strategy == "mf" or (alpha > 0.5 and mf >= content):
        return "Readers with similar taste"
    if bookmarked_book_ids and strategy == "content":
        return "Matches your saved picks"
    return "Similar descriptions"


def hybrid_recommend(
    user_id: int,
    rated_book_ids: set[int],
    n: int = 5,
    *,
    rated_values: dict[int, float] | None = None,
    bookmarked_book_ids: set[int] | None = None,
    mf: MatrixFactorizationRecommender = recommender,
    content: ContentRecommender = content_recommender,
    book_genres: dict[int, str | None] | None = None,
    book_authors: dict[int, str | None] | None = None,
    onboarding_genre_boosts: set[str] | None = None,
    serendipity_beta: float = 0.18,
) -> tuple[list[dict], str, dict]:
    if not content.is_fitted:
        raise RuntimeError(
            "Content recommender not fitted. Restart the server after importing books."
        )

    bookmarks = bookmarked_book_ids or set()
    profile_ids = rated_book_ids | bookmarks
    content_raw = content.score_all(profile_ids)
    content_scores = normalize_score_map(content_raw)

    values = rated_values or {}
    alpha, blend_method = learn_blend_alpha(
        user_id, rated_book_ids, values, mf, content
    )

    mf_scores: dict[int, float] = {}
    if alpha > 0 and mf.is_fitted:
        mf_scores = normalize_score_map(mf_score_all(mf, user_id, rated_book_ids))

    if mf_scores and alpha > 0:
        strategy = "hybrid" if alpha < 0.85 else "mf"
        all_ids = set(content_scores) | set(mf_scores)
        blended: dict[int, float] = {}
        for bid in all_ids:
            blended[bid] = alpha * mf_scores.get(bid, 0.0) + (1.0 - alpha) * content_scores.get(bid, 0.0)
    else:
        strategy = "content"
        blended = content_scores

    for bid in rated_book_ids | bookmarks:
        blended.pop(bid, None)

    genres = book_genres or {}
    boost_genres = onboarding_genre_boosts or set()
    apply_genre_boost(blended, genres, boost_genres)

    authors = book_authors or {}
    vectors = book_content_vectors(content)
    profile = user_content_profile(content, profile_ids)

    top = select_constrained(
        blended,
        genres,
        authors,
        vectors,
        profile,
        n,
        serendipity_beta=serendipity_beta,
    )

    meta = {
        "mf_weight": round(alpha, 2),
        "content_weight": round(1.0 - alpha, 2),
        "n_ratings": len(rated_book_ids),
        "n_bookmarks": len(bookmarks),
        "blend_method": blend_method,
        "ranking": "constrained_mmr",
    }

    results = []
    for book_id, score in top:
        results.append({
            "book_id": book_id,
            "predicted_score": round(score, 4),
            "reason": _reason_for_book(
                book_id,
                rated_book_ids=rated_book_ids,
                bookmarked_book_ids=bookmarks,
                book_genres=genres,
                mf_scores=mf_scores,
                content_scores=content_scores,
                alpha=alpha,
                strategy=strategy,
                blend_method=blend_method,
                onboarding_genres=boost_genres if boost_genres else None,
            ),
        })

    return results, strategy, meta
