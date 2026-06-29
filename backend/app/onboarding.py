"""
Onboarding quiz logic: archetypes, genre hints, serendipity tuning.
"""

from __future__ import annotations

import json

from .models import User

MOOD_OPTIONS = {
    "cozy_mystery": "Cozy mystery",
    "space_opera": "Space opera",
    "messy_romance": "Messy romance",
    "big_ideas": "Big ideas",
}

THIS_OR_THAT_OPTIONS = {
    "plot_twist": "Plot twist",
    "emotional_ending": "Emotional ending",
    "series": "Book series",
    "standalone": "Standalone",
}

MOOD_GENRE_HINTS: dict[str, list[str]] = {
    "cozy_mystery": ["Mystery", "Literature", "Fiction"],
    "space_opera": ["Science Fiction", "Science & Math"],
    "messy_romance": ["Romance", "Literature"],
    "big_ideas": ["Philosophy", "Science & Math", "Social Sciences"],
}


def parse_onboarding(user: User | None) -> dict:
    if not user or not user.onboarding_payload:
        return {
            "mood": None,
            "this_or_that": None,
            "genres": [],
            "book_ids": [],
            "serendipity_beta": 0.18,
        }
    try:
        data = json.loads(user.onboarding_payload)
    except json.JSONDecodeError:
        return {
            "mood": None,
            "this_or_that": None,
            "genres": [],
            "book_ids": [],
            "serendipity_beta": 0.18,
        }
    choice = data.get("this_or_that")
    serendipity = 0.28 if choice == "plot_twist" else 0.14 if choice == "emotional_ending" else 0.18
    return {
        "mood": data.get("mood"),
        "this_or_that": choice,
        "genres": list(data.get("genres") or []),
        "book_ids": [int(b) for b in (data.get("book_ids") or [])],
        "serendipity_beta": serendipity,
    }


def effective_genre_boosts(mood: str | None, genres: list[str]) -> set[str]:
    boosts = set(genres)
    if mood and mood in MOOD_GENRE_HINTS:
        boosts.update(MOOD_GENRE_HINTS[mood])
    return boosts


def derive_archetype(
    mood: str | None,
    this_or_that: str | None,
    genres: list[str],
) -> tuple[str, str]:
    """Return (archetype_title, tagline)."""
    if not mood and not genres:
        return (
            "Curious Newcomer",
            "Your shelf is a blank page — we'll learn fast as you explore.",
        )

    mood_key = mood or ""
    choice = this_or_that or ""

    if mood_key == "cozy_mystery":
        title = "Cozy Sleuth" if choice == "plot_twist" else "Rainy-Day Reader"
        tag = "You want atmosphere, clues, and a world you can sink into."
    elif mood_key == "space_opera":
        title = "Galaxy Drifter" if choice == "series" else "Nebula Nomad"
        tag = "Big skies, bold ideas, and worlds beyond the page."
    elif mood_key == "messy_romance":
        title = "Hopeless Romantic" if choice == "emotional_ending" else "Chaos Reader"
        tag = "Feelings first — the messier the better."
    elif mood_key == "big_ideas":
        title = "Idea Archaeologist" if choice == "standalone" else "Deep-Dive Scholar"
        tag = "You read to think, argue, and see the world differently."
    else:
        title = "Eclectic Explorer"
        tag = "Your picks span shelves — we'll keep the variety coming."

    if genres:
        top = genres[0].split("&")[0].strip()
        if len(genres) == 1:
            tag = f"Grounded in {top} — with room to wander."
        elif len(genres) >= 3:
            title = f"{title} · Multi-shelf"

    return title, tag


def apply_genre_boost(
    blended: dict[int, float],
    book_genres: dict[int, str | None],
    boost_genres: set[str],
    factor: float = 0.15,
) -> None:
    if not boost_genres:
        return
    lowered = [g.lower() for g in boost_genres]

    def matches(genre: str | None) -> bool:
        if not genre:
            return False
        g = genre.lower()
        return any(b in g or g in b for b in lowered)

    for bid, score in list(blended.items()):
        if matches(book_genres.get(bid)):
            blended[bid] = score * (1.0 + factor)
