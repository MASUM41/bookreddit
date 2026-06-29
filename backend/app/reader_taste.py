"""
Reader taste profile — unique BookReddit signal from ratings, saves, and latent vectors.

Uses genre weighting (linear combination of explicit ratings + bookmarks) and
optional MF/content vector similarity for reader-to-reader compatibility.
"""

from __future__ import annotations

import math
from collections import defaultdict

import json
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from . import models
from .content_recommender import ContentRecommender, content_recommender
from .rec_common import user_content_profile
from .recommender import MatrixFactorizationRecommender, recommender


def _genre_entropy(weights: dict[str, float]) -> float:
    total = sum(weights.values())
    if total <= 0 or len(weights) < 2:
        return 0.0
    probs = [w / total for w in weights.values() if w > 0]
    return float(-sum(p * math.log(p + 1e-12) for p in probs))


def _archetype(genre_weights: dict[str, float]) -> tuple[str, str]:
    if not genre_weights:
        return (
            "Curious newcomer",
            "Rate and save books to unlock your reading DNA.",
        )

    total = sum(genre_weights.values())
    top_genre = max(genre_weights, key=genre_weights.get)
    top_share = genre_weights[top_genre] / total
    entropy = _genre_entropy(genre_weights)
    n_genres = len(genre_weights)

    if n_genres >= 4 and entropy > 1.6:
        return (
            "Genre explorer",
            f"You read widely across {n_genres} genres — we balance comfort picks with surprises.",
        )
    if top_share >= 0.55:
        short = top_genre.split("&")[0].strip()[:28]
        return (
            f"{short} devotee",
            f"Most of your signal clusters around {top_genre}. We'll still nudge you toward fresh voices.",
        )
    if n_genres >= 2:
        return (
            "Eclectic reader",
            "Your taste spans several shelves — hybrid recs blend community patterns with your descriptions.",
        )
    return (
        "Focused reader",
        f"You're building a clear lane in {top_genre}.",
    )


def _load_taste_rows(db: Session, user_id: int) -> tuple[list[tuple], list[tuple]]:
    """Return (rated_rows, bookmark_rows) as (genre, author, weight) tuples."""
    rated = db.execute(
        select(
            models.Book.genre,
            models.Book.author,
            models.UserBookInteraction.value,
        )
        .join(models.Book, models.Book.id == models.UserBookInteraction.book_id)
        .where(
            models.UserBookInteraction.user_id == user_id,
            models.UserBookInteraction.interaction_type == models.InteractionType.rating,
        )
    ).all()

    bookmarked = db.execute(
        select(models.Book.genre, models.Book.author)
        .join(models.UserBookInteraction, models.UserBookInteraction.book_id == models.Book.id)
        .where(
            models.UserBookInteraction.user_id == user_id,
            models.UserBookInteraction.interaction_type == models.InteractionType.bookmark,
        )
    ).all()

    rated_rows = [(g, a, float(v)) for g, a, v in rated]
    bookmark_rows = [(g, a) for g, a in bookmarked]
    return rated_rows, bookmark_rows


def build_reader_taste(db: Session, user_id: int) -> dict:
    user = db.get(models.User, user_id)
    rated_rows, bookmark_rows = _load_taste_rows(db, user_id)

    genre_weights: dict[str, float] = defaultdict(float)
    author_weights: dict[str, float] = defaultdict(float)

    for genre, author, value in rated_rows:
        label = genre or "Uncategorized"
        genre_weights[label] += max(1.0, value)
        if author:
            author_weights[author.strip()] += max(1.0, value)

    if user and user.onboarding_payload:
        try:
            ob = json.loads(user.onboarding_payload)
            for g in ob.get("genres") or []:
                genre_weights[g] += 2.0
        except json.JSONDecodeError:
            pass

    for genre, author in bookmark_rows:
        label = genre or "Uncategorized"
        genre_weights[label] += 2.5
        if author:
            author_weights[author.strip()] += 1.5

    total_genre = sum(genre_weights.values()) or 1.0
    genres = sorted(
        [
            {
                "genre": g,
                "weight": round(w, 2),
                "pct": round(100.0 * w / total_genre, 1),
            }
            for g, w in genre_weights.items()
        ],
        key=lambda x: x["weight"],
        reverse=True,
    )[:8]

    top_authors = [
        a for a, _ in sorted(author_weights.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    archetype, tagline = _archetype(genre_weights)
    if user and user.onboarding_archetype and len(rated_rows) < 3:
        archetype = user.onboarding_archetype
        tagline = "Shaped by your onboarding quiz — updates as you rate more books."
    max_entropy = math.log(max(len(genre_weights), 2))
    exploration = round(_genre_entropy(genre_weights) / max_entropy, 2) if genre_weights else 0.0

    return {
        "archetype": archetype,
        "tagline": tagline,
        "genres": genres,
        "top_authors": top_authors,
        "n_ratings": len(rated_rows),
        "n_bookmarks": len(bookmark_rows),
        "exploration_score": exploration,
    }


def taste_compatibility(
    user_a: int,
    user_b: int,
    db: Session,
    mf: MatrixFactorizationRecommender = recommender,
    content: ContentRecommender = content_recommender,
) -> dict | None:
    """Cosine similarity of reader taste vectors in MF or content latent space."""
    if user_a == user_b:
        return {"score": 1.0, "label": "That's you!", "method": "self"}

    vec_a: np.ndarray | None = None
    vec_b: np.ndarray | None = None
    method = "content"

    if mf.is_fitted and mf.P is not None:
        if user_a in mf.user_id_to_idx and user_b in mf.user_id_to_idx:
            vec_a = mf.P[mf.user_id_to_idx[user_a]]
            vec_b = mf.P[mf.user_id_to_idx[user_b]]
            method = "collaborative"

    if vec_a is None or vec_b is None:
        if not content.is_fitted:
            return None
        rated_a = {
            int(row[0])
            for row in db.execute(
                select(models.UserBookInteraction.book_id).where(
                    models.UserBookInteraction.user_id == user_a,
                    models.UserBookInteraction.interaction_type == models.InteractionType.rating,
                )
            ).all()
        }
        rated_b = {
            int(row[0])
            for row in db.execute(
                select(models.UserBookInteraction.book_id).where(
                    models.UserBookInteraction.user_id == user_b,
                    models.UserBookInteraction.interaction_type == models.InteractionType.rating,
                )
            ).all()
        }
        bm_a = {
            int(row[0])
            for row in db.execute(
                select(models.UserBookInteraction.book_id).where(
                    models.UserBookInteraction.user_id == user_a,
                    models.UserBookInteraction.interaction_type == models.InteractionType.bookmark,
                )
            ).all()
        }
        bm_b = {
            int(row[0])
            for row in db.execute(
                select(models.UserBookInteraction.book_id).where(
                    models.UserBookInteraction.user_id == user_b,
                    models.UserBookInteraction.interaction_type == models.InteractionType.bookmark,
                )
            ).all()
        }
        vec_a = user_content_profile(content, rated_a | bm_a)
        vec_b = user_content_profile(content, rated_b | bm_b)
        method = "content"

    if vec_a is None or vec_b is None:
        return None

    sim = float(vec_a @ vec_b / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b) + 1e-9))
    sim = max(0.0, min(1.0, sim))
    pct = round(sim * 100)

    if pct >= 75:
        label = "Kindred spirits"
    elif pct >= 50:
        label = "Similar shelves"
    elif pct >= 30:
        label = "Some overlap"
    else:
        label = "Different tastes"

    return {"score": round(sim, 3), "pct": pct, "label": label, "method": method}
