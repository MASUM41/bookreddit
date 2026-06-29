"""Supplemental catalog edge-case queries."""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent / "bookreddit.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

print("=== SHORT TITLES ===")
for r in c.execute("SELECT id, title, author, genre FROM books WHERE length(title) < 3"):
    print(r)

print("\n=== SHORT DESCRIPTIONS (<50) sample 10 ===")
for r in c.execute(
    """
    SELECT id, title, author, genre, length(description),
           substr(description, 1, 80)
    FROM books
    WHERE description IS NULL OR length(trim(description)) < 50
    LIMIT 10
    """
):
    print(r)

print("\n=== ALL GENRES ===")
for r in c.execute(
    "SELECT genre, count(*) FROM books GROUP BY genre ORDER BY count(*)"
):
    print(r)

print("\n=== BOOKS WITH NO ISBN (sample) ===")
for r in c.execute(
    """
    SELECT id, title, author FROM books
    WHERE isbn IS NULL OR trim(isbn) = ''
    LIMIT 15
    """
):
    print(r)

print("\n=== TEST-LIKE TITLES ===")
for r in c.execute(
    """
    SELECT id, title, author, genre FROM books
    WHERE lower(title) LIKE '%test%'
    LIMIT 20
    """
):
    print(r)

cols = [x[1] for x in c.execute("PRAGMA table_info(books)")]
print("\n=== OPTIONAL FIELD COVERAGE ===")
print("Columns:", cols)
for col in ["year", "publisher", "cover_url", "image_url", "thumbnail"]:
    if col in cols:
        n = c.execute(
            f"SELECT count(*) FROM books WHERE {col} IS NOT NULL AND trim({col}) != ''"
        ).fetchone()[0]
        print(f"  {col}: {n:,}")

print("\n=== AUTHOR ANOMALIES (very short / numeric) ===")
for r in c.execute(
    """
    SELECT id, title, author FROM books
    WHERE length(trim(author)) < 2 OR author GLOB '[0-9]*'
    LIMIT 10
    """
):
    print(r)

print("\n=== DESCRIPTION LENGTH DISTRIBUTION (percentiles) ===")
lengths = sorted(
    r[0]
    for r in c.execute(
        "SELECT length(trim(description)) FROM books WHERE description IS NOT NULL AND trim(description) != ''"
    )
)
if lengths:
    for p in [10, 25, 50, 75, 90, 95, 99]:
        idx = min(int(len(lengths) * p / 100), len(lengths) - 1)
        print(f"  p{p}: {lengths[idx]} chars")

print("\n=== TEST BOOK ENGAGEMENT ===")
for r in c.execute(
    "SELECT id, book_id, title FROM posts WHERE book_id IN (1, 2, 3)"
):
    print("  post:", r)
for r in c.execute(
    """
    SELECT user_id, book_id, value, interaction_type
    FROM user_book_interactions WHERE book_id IN (1, 2, 3)
    """
):
    print("  interaction:", r)

conn.close()
