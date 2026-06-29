"""One-off catalog quality audit for BookReddit SQLite."""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

DB = Path(__file__).parent / "bookreddit.db"


def main() -> None:
    if not DB.exists():
        print(f"DB not found: {DB}")
        return

    conn = sqlite3.connect(DB)
    c = conn.cursor()
    total = c.execute("SELECT COUNT(*) FROM books").fetchone()[0]

    print("=== CATALOG OVERVIEW ===")
    print(f"Total books: {total:,}\n")

    no_desc, short, medium, long_, avg_len = c.execute(
        """
        SELECT
          SUM(CASE WHEN description IS NULL OR TRIM(description) = '' THEN 1 ELSE 0 END),
          SUM(CASE WHEN description IS NOT NULL AND LENGTH(TRIM(description)) < 50 THEN 1 ELSE 0 END),
          SUM(CASE WHEN description IS NOT NULL AND LENGTH(TRIM(description)) BETWEEN 50 AND 199 THEN 1 ELSE 0 END),
          SUM(CASE WHEN description IS NOT NULL AND LENGTH(TRIM(description)) >= 200 THEN 1 ELSE 0 END),
          AVG(CASE WHEN description IS NOT NULL AND TRIM(description) != ''
              THEN LENGTH(description) END)
        FROM books
        """
    ).fetchone()

    print("=== DESCRIPTIONS ===")
    pct = lambda n: f"{100 * n / total:.1f}%" if total else "0%"
    print(f"  Missing/empty:     {no_desc:,} ({pct(no_desc)})")
    print(f"  Short (<50 chars): {short:,} ({pct(short)})")
    print(f"  Medium (50-199):   {medium:,} ({pct(medium)})")
    print(f"  Good (200+ chars): {long_:,} ({pct(long_)})")
    if avg_len:
        print(f"  Avg length (non-empty): {avg_len:.0f} chars")

    usable = c.execute(
        """
        SELECT COUNT(*) FROM books WHERE
          TRIM(COALESCE(title,'')) != '' AND TRIM(COALESCE(author,'')) != ''
          AND (
            (description IS NOT NULL AND LENGTH(TRIM(description)) >= 30)
            OR (LENGTH(TRIM(COALESCE(title,''))) + LENGTH(TRIM(COALESCE(author,''))) >= 20)
          )
        """
    ).fetchone()[0]
    print(f"  Content-rec usable (heuristic): {usable:,} ({pct(usable)})")

    no_genre, n_genres = c.execute(
        """
        SELECT
          SUM(CASE WHEN genre IS NULL OR TRIM(genre) = '' THEN 1 ELSE 0 END),
          COUNT(DISTINCT genre)
        FROM books
        """
    ).fetchone()

    print("\n=== GENRES ===")
    print(f"  Missing genre: {no_genre:,} ({pct(no_genre)})")
    print(f"  Distinct genres: {n_genres:,}")

    # Dewey-like: mostly digits
    dewey_like = 0
    for (genre,) in c.execute("SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL"):
        if genre and re.match(r"^[\d.\s\-]+$", genre.strip()) and any(ch.isdigit() for ch in genre):
            dewey_like += c.execute(
                "SELECT COUNT(*) FROM books WHERE genre = ?", (genre,)
            ).fetchone()[0]
    print(f"  Raw Dewey/numeric-looking genres: {dewey_like:,}")

    print("  Top 15 genres:")
    for genre, n in c.execute(
        """
        SELECT genre, COUNT(*) FROM books
        WHERE genre IS NOT NULL AND TRIM(genre) != ''
        GROUP BY genre ORDER BY COUNT(*) DESC LIMIT 15
        """
    ):
        print(f"    {n:5,}  {(genre or '')[:65]}")

    with_isbn, distinct_isbn = c.execute(
        """
        SELECT
          SUM(CASE WHEN isbn IS NOT NULL AND TRIM(isbn) != '' THEN 1 ELSE 0 END),
          COUNT(DISTINCT isbn)
        FROM books WHERE isbn IS NOT NULL AND TRIM(isbn) != ''
        """
    ).fetchone()

    print("\n=== ISBN ===")
    print(f"  With ISBN: {with_isbn:,} ({pct(with_isbn)})")
    print(f"  Distinct ISBNs: {distinct_isbn:,}")

    dup_groups = c.execute(
        """
        SELECT COUNT(*) FROM (
          SELECT 1 FROM books
          GROUP BY LOWER(TRIM(title)), LOWER(TRIM(author)) HAVING COUNT(*) > 1
        )
        """
    ).fetchone()[0]
    dup_extra = c.execute(
        """
        SELECT COALESCE(SUM(c - 1), 0) FROM (
          SELECT COUNT(*) c FROM books
          GROUP BY LOWER(TRIM(title)), LOWER(TRIM(author)) HAVING COUNT(*) > 1
        )
        """
    ).fetchone()[0]
    dup_isbn = c.execute(
        """
        SELECT COUNT(*) FROM (
          SELECT isbn FROM books WHERE isbn IS NOT NULL AND TRIM(isbn) != ''
          GROUP BY isbn HAVING COUNT(*) > 1
        )
        """
    ).fetchone()[0]

    print("\n=== DUPLICATES ===")
    print(f"  title+author duplicate groups: {dup_groups:,}")
    print(f"  extra duplicate rows: {dup_extra:,}")
    print(f"  ISBN duplicate groups: {dup_isbn:,}")

    short_title = c.execute(
        "SELECT COUNT(*) FROM books WHERE LENGTH(TRIM(title)) < 3"
    ).fetchone()[0]
    missing_author = c.execute(
        "SELECT COUNT(*) FROM books WHERE author IS NULL OR TRIM(author) = ''"
    ).fetchone()[0]

    print("\n=== FIELD QUALITY ===")
    print(f"  Very short titles (<3 chars): {short_title:,}")
    print(f"  Missing author: {missing_author:,}")

    posts_books = c.execute("SELECT COUNT(DISTINCT book_id) FROM posts").fetchone()[0]
    rated_books = c.execute(
        "SELECT COUNT(DISTINCT book_id) FROM user_book_interactions WHERE interaction_type = 'rating'"
    ).fetchone()[0]
    n_posts = c.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    n_ratings = c.execute(
        "SELECT COUNT(*) FROM user_book_interactions WHERE interaction_type = 'rating'"
    ).fetchone()[0]

    print("\n=== ENGAGEMENT ===")
    print(f"  Books with posts: {posts_books:,}")
    print(f"  Books with ratings: {rated_books:,}")
    print(f"  Total posts: {n_posts:,}")
    print(f"  Total ratings: {n_ratings:,}")

    # Health score
    good_desc_pct = 100 * (long_ or 0) / total if total else 0
    genre_pct = 100 * (total - (no_genre or 0)) / total if total else 0
    deduped_est = total - (dup_extra or 0)
    print("\n=== HEALTH SCORE (rough) ===")
    print(f"  Est. unique title+author rows: {deduped_est:,}")
    print(f"  Genre coverage: {genre_pct:.1f}%")
    print(f"  Good descriptions (200+): {good_desc_pct:.1f}%")
    if good_desc_pct >= 70 and genre_pct >= 95 and dup_extra < total * 0.05:
        verdict = "STRONG — catalog is in good shape for recs"
    elif good_desc_pct >= 50 and genre_pct >= 90:
        verdict = "OK — enrich descriptions & dedupe before scaling up"
    else:
        verdict = "NEEDS WORK — fix genres/descriptions before adding more books"
    print(f"  Verdict: {verdict}")

    print("\n=== SAMPLES: missing description ===")
    for row in c.execute(
        """
        SELECT id, title, author, genre FROM books
        WHERE description IS NULL OR TRIM(description) = '' LIMIT 5
        """
    ):
        print(f"  id={row[0]} | {row[1][:50]} | {row[2][:30]} | {row[3]}")

    print("\n=== SAMPLES: top duplicates ===")
    for row in c.execute(
        """
        SELECT title, author, COUNT(*) c FROM books
        GROUP BY LOWER(TRIM(title)), LOWER(TRIM(author))
        HAVING c > 1 ORDER BY c DESC LIMIT 5
        """
    ):
        print(f"  x{row[2]} | {row[0][:50]} | {row[1][:35]}")

    conn.close()


if __name__ == "__main__":
    main()
